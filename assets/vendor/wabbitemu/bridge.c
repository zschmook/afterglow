#include "stdafx.h"
#include <emscripten.h>
#include "core.h"
#include "83psehw.h"
#include "keys.h"
#include "lcd.h"
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

void FlippedLeft(CPU_t *cpu,unsigned char output){}
void FlippedRight(CPU_t *cpu,unsigned char output){}
void nextsample(CPU_t *cpu){}
