#include "stdafx.h"
#include <emscripten.h>
#include "core.h"
#include "83psehw.h"
#include "keys.h"
#include "lcd.h"
#include "link.h"
static CPU_t cpu;
static memc memory;
static timerc timer;
static unsigned char pixels[6144];
EMSCRIPTEN_KEEPALIVE int ag_init(int model){
 if(model==3)memory_init_84p(&memory);else memory_init_83pse(&memory);
 tc_init(&timer,MHZ_6);CPU_init(&cpu,&memory,&timer);device_init_83pse(&cpu,model==3?TI_84P:TI_84PSE);CPU_reset(&cpu);return (int)memory.flash;
}
EMSCRIPTEN_KEEPALIVE void ag_tick(int cycles){unsigned long long end=timer.tstates+cycles;while(timer.tstates<end)CPU_step(&cpu);}
EMSCRIPTEN_KEEPALIVE int ag_rate(void){return timer.freq;}
EMSCRIPTEN_KEEPALIVE void ag_key(int key,int down){if(key==128)cpu.pio.keypad->on_pressed=down?KEY_KEYBOARDPRESS:0;else if(key>=0&&key<128&&(key&15)<8)cpu.pio.keypad->keys[key>>4][key&15]=down?KEY_KEYBOARDPRESS:0;}
EMSCRIPTEN_KEEPALIVE unsigned char *ag_frame(void){LCD_t *lcd=(LCD_t*)cpu.pio.lcd;for(int y=0;y<64;y++)for(int x=0;x<96;x++)pixels[y*96+x]=lcd->base.active?!!(lcd->display[((y+lcd->base.z)%64)*16+x/8]&(128>>(x%8))):0;return pixels;}
EMSCRIPTEN_KEEPALIVE int ag_on(void){return cpu.pio.lcd->active;}
EMSCRIPTEN_KEEPALIVE int ag_pc(void){return cpu.pc;}

/* A bounded virtual TI link cable. The OS, rather than direct RAM patches,
 * allocates and installs the program. Only single classic .8xp programs enter. */
static unsigned char program_file[32768];
static unsigned long long link_deadline;
EMSCRIPTEN_KEEPALIVE unsigned char *ag_program_buffer(void){return program_file;}
static int cable_state(void){return ((cpu.pio.link->vout|cpu.pio.link->host)&3)^3;}
static int cable_wait(int state,int equal){
 unsigned long long end=timer.tstates+timer.freq*2;
 while((cable_state()==state)==equal){
  if(timer.tstates>=end||timer.tstates>=link_deadline)return 0;
  CPU_step(&cpu);
 }
 return 1;
}
static int cable_send(unsigned char b){
 for(int i=0;i<8;i++,b>>=1){
  cpu.pio.link->vout=(b&1)+1;
  if(!cable_wait(0,0))return 0;
  cpu.pio.link->vout=0;
  if(!cable_wait(3,0))return 0;
 }
 return 1;
}
static int cable_recv(void){
 int b=0;
 for(int i=0;i<8;i++){
  if(!cable_wait(3,1))return -1;
  int state=cable_state();if(state!=1&&state!=2)return -1;
  if(state==1)b|=1<<i;
  cpu.pio.link->vout=state;
  if(!cable_wait(0,1))return -1;
  cpu.pio.link->vout=0;
 }
 return b;
}
static int send_packet(int command,unsigned char *data,int size){
 ag_tick(100);
 if(!cable_send(0x23)||!cable_send(command)||!cable_send(size&255)||!cable_send(size>>8))return 0;
 unsigned int sum=0;
 for(int i=0;i<size;i++){sum+=data[i];if(!cable_send(data[i]))return 0;}
 return !size||(cable_send(sum&255)&&cable_send((sum>>8)&255));
}
static int receive_control(int expected){
 int machine=cable_recv(),command=cable_recv(),lo=cable_recv(),hi=cable_recv();
 /* TI-84 CTS repeats the variable-header length but carries no payload. */
 return (machine==0x73||machine==0x23)&&command==expected&&lo>=0&&hi>=0;
}
static int word_at(int offset){return program_file[offset]|program_file[offset+1]<<8;}
EMSCRIPTEN_KEEPALIVE int ag_import_program(int size){
 if(size<76||size>32768||memcmp(program_file,"**TI83F*\x1a\x0a\x00",11))return 10;
 int n=word_at(57);
 if(word_at(55)!=13||word_at(53)!=size-57||n+74!=size||word_at(70)!=n||word_at(72)!=n-2)return 10;
 if(program_file[59]!=5&&program_file[59]!=6)return 10;
 int ended=0;
 for(int i=60;i<68;i++){int c=program_file[i];if(!c){ended=1;continue;}if(ended||!((c>='A'&&c<='Z')||(i>60&&c>='0'&&c<='9')))return 10;}
 if(!program_file[60])return 10;
 unsigned int sum=0;for(int i=55;i<size-2;i++)sum+=program_file[i];
 if((sum&65535)!=word_at(size-2))return 10;
 if(!cpu.pio.lcd->active)return 11;
 link_t *link=cpu.pio.link;unsigned char *previous=link->client;
 link->vout=0;link->client=&link->vout;link_deadline=timer.tstates+(unsigned long long)timer.freq*120;
 unsigned char header[13]={n&255,n>>8,program_file[59]};
 memcpy(header+3,program_file+60,8);header[11]=program_file[68];
 int result=0;
 if(!send_packet(0xc9,header,13))result=20;
 else if(!receive_control(0x56))result=21;
 else if(!receive_control(0x09))result=22;
 else if(!send_packet(0x56,NULL,0)||!send_packet(0x15,program_file+72,n))result=23;
 else if(!receive_control(0x56))result=24;
 else if(!send_packet(0x92,NULL,0))result=25;
 link->vout=0;link->client=previous;
 return result;
}

int FlippedLeft(CPU_t *cpu,int output){return 0;}
int FlippedRight(CPU_t *cpu,int output){return 0;}
int nextsample(CPU_t *cpu){return 0;}
