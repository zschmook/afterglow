import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from io import BytesIO
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server

class FeedTests(unittest.TestCase):
    def setUp(self):
        server.CACHE.clear()
        server.RETRY_AFTER.clear()

    def test_local_interleaves_and_deduplicates(self):
        lnp={'data':[{'url':'a'}, {'url':'b'}], 'stale':False}
        wgal={'data':[{'url':'c'}, {'url':'b'}], 'stale':False}
        self.assertEqual([x['url'] for x in server.combine_news(lnp,wgal)['data']], ['a','c','b'])

    def test_one_failed_publisher_keeps_other(self):
        data=server.combine_news({'data':None,'stale':True},{'data':[{'url':'a'}],'stale':False})
        self.assertEqual(len(data['data']),1)
        self.assertFalse(data['sources']['LNP']['available'])
        self.assertTrue(data['sources']['WGAL']['available'])

    def test_multiple_publishers_dedupe_and_keep_failure_isolated(self):
        result = server.combine_publishers([
            ('Washington Post', {'data': None, 'stale': True}),
            ('NPR', {'data': [{'url': 'one'}, {'url': 'shared'}], 'stale': False}),
            ('CBS', {'data': [{'url': 'two'}, {'url': 'shared'}], 'stale': False}),
        ])
        self.assertEqual([item['url'] for item in result['data']], ['one', 'two', 'shared'])
        self.assertTrue(result['sources']['NPR']['available'])
        self.assertFalse(result['sources']['Washington Post']['available'])
        self.assertTrue(result['stale'])

    def test_failed_requests_back_off_and_preserve_cache(self):
        server.CACHE['news']={'data':[{'url':'a'}],'fetched':0,'stale':False}
        with patch.object(server,'urlopen',side_effect=OSError('offline')) as fetch:
            a=server.fetch_feed('news');b=server.fetch_feed('news')
        self.assertTrue(a['stale']);self.assertEqual(a,b)
        fetch.assert_called_once()

    def test_rss_source_labels(self):
        xml=b'<rss><channel><item><title>Example</title><link>https://example.com</link><pubDate>Fri, 02 Oct 2026 16:00:00 GMT</pubDate></item></channel></rss>'
        for key, (label, _) in server.NEWS_FEEDS.items():
            with patch.object(server,'urlopen',return_value=BytesIO(xml)):
                self.assertEqual(server.fetch_feed(key)['data'][0]['source'],label)

    def test_empty_feed_retains_previous_headlines(self):
        server.CACHE['news']={'data':[{'url':'a'}],'fetched':0,'stale':False}
        with patch.object(server,'urlopen',return_value=BytesIO(b'<rss><channel/></rss>')):
            result=server.fetch_feed('news')
        self.assertTrue(result['stale']);self.assertEqual(result['data'][0]['url'],'a')

    def test_college_deduplicates_crossover_games_and_prioritizes_live(self):
        scheduled={'id':'1','date':'2026-10-02','status':{'type':{'state':'pre'}}}
        live={'id':'2','date':'2026-10-03','status':{'type':{'state':'in'}}}
        result=server.combine_college({'data':{'events':[scheduled]},'stale':False},
                                      {'data':{'events':[scheduled,live]},'stale':False})
        self.assertEqual([e['id'] for e in result['data']['events']],['2','1'])

    def test_college_keeps_available_division(self):
        result=server.combine_college({'data':{'events':[{'id':'1'}]},'stale':False},
                                      {'data':None,'stale':True})
        self.assertTrue(result['stale'])
        self.assertEqual(len(result['data']['events']),1)

    def test_sports_selection_defaults_and_rejects_unknown_feeds(self):
        self.assertEqual(server.selected_sports({}), ['nfl','ncaa'])
        self.assertEqual(server.selected_sports({'leagues':['mlb,mls,mlb']}), ['mlb','mls'])
        for value in ('', 'made-up', 'nfl,https://example.com'):
            with self.assertRaises(ValueError):
                server.selected_sports({'leagues':[value]})

    def test_nonfootball_skips_football_team_location_lookup(self):
        sports={'mls':{'data':{'events':[{'status':{'type':{'state':'in'}},'competitions':[{'competitors':[{'team':{'id':'1'}}]}]}]}}}
        with patch.object(server,'team_location') as lookup:
            self.assertEqual(server.add_team_locations(sports),sports)
        lookup.assert_not_called()

if __name__=='__main__': unittest.main()
