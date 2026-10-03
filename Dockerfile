FROM python:3.12-alpine
WORKDIR /app
COPY server.py system_stats.py windows_gpu.py requirements.txt index.html app.js style.css ./
RUN pip install --no-cache-dir -r requirements.txt
COPY assets/vapor.min.css assets/vapor.min.css
COPY assets/leaflet assets/leaflet
COPY assets/widgets.js assets/widgets.js
COPY assets/home.js assets/home.js
COPY assets/weather-icons/meteocons assets/weather-icons/meteocons
USER 10001:10001
ENV PORT=8080 HOME_SERVICE=http://host.docker.internal:9998
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2)"
CMD ["python", "-u", "server.py"]

COPY assets/preferences.js assets/settings.js assets/

COPY assets/alarms.js assets/alarms.js

COPY assets/panel-boot.js assets/panels.js assets/

COPY assets/quotes.js assets/quotes.js
COPY assets/weather-alerts.js assets/weather-alerts.js
COPY assets/calendar.js assets/calendar.js

COPY assets/system-stats.js assets/system-stats.js

COPY assets/center-panel.js assets/center-panel.js

COPY assets/stats-settings.js assets/stats-settings.js
