'use strict';

/* ============================================================
   DATA — PRODUCTS, CATEGORIES, GAMES DEFINITIONS
   ============================================================ */
let PRODUCTS = [
  { id:'esp',  name:'Espresso',       category:'Espresso',   price:18000, description:'A single, concentrated pull. Clean finish, no bitterness.', available:true },
  { id:'ame',  name:'Americano',      category:'Espresso',   price:20000, description:'Espresso and hot water. Simple and direct.', available:true },
  { id:'cap',  name:'Cappuccino',     category:'Coffee',     price:23000, description:'Equal parts espresso, steamed milk, and microfoam. Classic ratio.', available:true },
  { id:'lat',  name:'Cafe Latte',     category:'Coffee',     price:24000, description:'Espresso with a generous pour of steamed milk. Smooth and mild.', available:true },
  { id:'car',  name:'Caramel Latte',  category:'Coffee',     price:27000, description:'Latte with house caramel. Not too sweet, not too much.', available:true },
  { id:'moc',  name:'Mocha',          category:'Coffee',     price:26000, description:'Espresso, dark chocolate, steamed milk. A proper mocha.', available:true },
  { id:'flt',  name:'Flat White',     category:'Coffee',     price:25000, description:'Double ristretto with velvety microfoam. Strong and silky.', available:true },
  { id:'eks',  name:'Es Kopi Susu',   category:'Iced',       price:22000, description:'Cold milk poured over a shot of espresso. Indonesian favourite.', available:true },
  { id:'eia',  name:'Iced Americano', category:'Iced',       price:21000, description:'Chilled espresso and cold water over ice. Clean and sharp.', available:true },
  { id:'eil',  name:'Iced Latte',     category:'Iced',       price:25000, description:'Espresso over ice with cold milk. Simple done right.', available:true },
  { id:'mch',  name:'Matcha Latte',   category:'Non Coffee', price:25000, description:'Ceremonial grade matcha with steamed oat milk. Earthy and smooth.', available:true },
  { id:'cho',  name:'Cokelat Panas',  category:'Non Coffee', price:22000, description:'Rich drinking chocolate with a hint of sea salt.', available:true },
  { id:'sig',  name:'Signature Coffee', category:'Signature', price:28000, description:'Our house blend: espresso, palm sugar syrup, cold milk, sea salt.', available:true },
  { id:'sgb',  name:'Cold Brew Tonic', category:'Signature', price:29000, description:'12-hour cold brew over tonic water. Bitter, bright, and complex.', available:true },
];

const CATEGORIES = ['All', 'Espresso', 'Coffee', 'Non Coffee', 'Iced', 'Signature'];

const GAMES = [
  { id:'snake',      title:'SNAKE',          desc:'Classic snake. Eat, grow, don\'t crash.',                  controls:[['Arrow Keys / WASD','Move']], category:'arcade' },
  { id:'tetris',     title:'TETRIS',         desc:'Stack the blocks. Clear the lines. Stay calm.',           controls:[['Left/Right','Move'],['Up / Z','Rotate'],['Down','Soft Drop'],['Space','Hard Drop']], category:'puzzle' },
  { id:'pong',       title:'PONG',           desc:'First to 7 wins. The machine does not miss often.',      controls:[['W / S','Left paddle'],['Up / Down','Right paddle']], category:'arcade' },
  { id:'breakout',   title:'BREAKOUT',       desc:'Clear the bricks. Don\'t drop the ball.',                controls:[['Left/Right / A/D','Move paddle'],['Space','Launch']], category:'arcade' },
  { id:'spaceinv',   title:'SPACE INVADERS', desc:'Hold the line. They keep coming.',                       controls:[['Left/Right / A/D','Move'],['Space','Shoot']], category:'arcade' },
  { id:'minesweep',  title:'MINESWEEPER',    desc:'Flag the mines. Don\'t guess wrong.',                    controls:[['Click','Reveal'],['Right Click','Flag']], category:'puzzle' },
  { id:'flappy',     title:'FLAPPY',         desc:'One button. Infinite ways to fail.',                     controls:[['Space / Click','Flap']], category:'arcade' },
  { id:'memory',     title:'MEMORY',         desc:'Flip, match, remember. Two cards at a time.',            controls:[['Click','Flip card']], category:'puzzle' },
  { id:'g2048',      title:'2048',           desc:'Slide the tiles. Reach 2048.',                           controls:[['Arrow Keys','Slide']], category:'puzzle' },
  { id:'tictactoe',  title:'TIC TAC TOE',    desc:'You versus the machine. Best of nothing.',               controls:[['Click','Place mark']], category:'puzzle' },
  { id:'spacewar',   title:'SPACE WAR',      desc:'Defend the cafe cosmos. Blast enemy raiders & espresso asteroids.', controls:[['Arrow Keys / A/D','Steer & Move'],['W / Up','Thrust'],['Space','Fire Lasers']], category:'arcade' },
  { id:'coffeemario', title:'COFFEE MARIO',  desc:'Barista platformer parody. Jump, stomp decaf cups & collect coffee beans!', controls:[['Arrow Keys / A/D','Move'],['Shift / X','Sprint / Dash'],['Space / Up / W','Jump (Hold = High)'],['Z / F','Steam Fireball']], category:'arcade' },
];

