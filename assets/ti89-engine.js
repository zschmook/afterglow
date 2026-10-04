/* SPDX-License-Identifier: GPL-2.0-or-later
 * Afterglow adapter for the TI-68k emulator. See vendor/ti68k/LICENSE.txt. */
((root)=>{
  function create(buffer){
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==2097152)throw Error('Choose a 2 MB classic TI-89 ROM, not a TI-84 or Titanium ROM.');
    const view=new DataView(buffer),tag=view.getUint16(0x12000),modelOffset=tag===0x800f?0x12008:tag===0x800e?0x12006:0;
    if(!modelOffset||view.getUint16(modelOffset-2)!==0x8011||view.getUint8(modelOffset)!==3)throw Error('This file is not a classic TI-89 ROM.');
    const rom=new Uint16Array(buffer.byteLength/2);for(let i=0;i<rom.length;i++)rom[i]=view.getUint16(i*2);
    let pixels=new Uint8Array(16000),initialized=false,screenOn=true;
    const stdlib={console:{log:()=>{}},setInterval:()=>1,clearInterval:()=>{}};
    const emu=root.TI68kEmulatorCoreModule(stdlib),link=root.TI68kEmulatorLinkModule(stdlib);
    const ui={
      setCalculatorModel:model=>{if(model!==3)throw Error('Only the classic TI-89 is supported.');},
      initemu:()=>{initialized=true;},initkeyhandlers:()=>{},reset:()=>{},
      display_no_rom_loaded:()=>{throw Error('The emulator could not recognize this ROM.');},
      set_screen_enabled_and_contrast:(model,hardware,c,d,h)=>{screenOn=hardware===1?!(d&0x10)||(c&0x3c)!==0x3c:!!(h&2)||(c&0x3c)!==0x3c;},
      draw_screen:(address,ram)=>{for(let i=0;i<16000;i++)pixels[i]=!!(ram[address+Math.floor(i/160)*15+((i%160)>>4)]&(0x8000>>((i%160)&15)));}
    };
    emu.setUI(ui);emu.setLink(link);link.setUI(ui);link.setEmu(emu);emu.setReset(()=>{});emu.setRom(rom);emu.initemu();
    if(!initialized)throw Error('TI-89 emulator self-check failed.');
    const key=(code,down)=>{if(code===80){down?emu.setONKeyPressed():emu.setONKeyReleased();}else if(Number.isInteger(code)&&code>=0&&code<=48)emu.setKey(code,down?1:0);};
    return {tick:()=>emu.emu_main_loop(),key,release:()=>{for(let i=0;i<=48;i++)emu.setKey(i,0);emu.setONKeyReleased();},frame:()=>screenOn?pixels.slice():new Uint8Array(16000),on:()=>screenOn};
  }
  root.AfterglowTI89={create};
})(typeof self==='undefined'?globalThis:self);
