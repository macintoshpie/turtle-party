events = [
  // pen_down()
  // pen_size(3)
  // color('green')
  // speed(5)
  // goto(10, 0)
  // (next line) pen_up() <- triggers message (pen went from down to up)
  {
    penDown: true, // should we draw a line from prev pos to next pos
    penSize: 3, // current size of pen
    color: 'green', // current color of pen
    goto: [10, 0], // position to move user's pen
    shape: null, // shape to draw at the updated user's pen position
    speed: 5, // how long to draw this before next frame. 10 = 1 frame, 1 = 60 frames
  },
  // pen_up()
  // color('red')
  // goto(50, 0)
  // shape('bot') <- triggers message
  {
    penDown: false, // don't draw a line from previous pos to new pos
    penSize: 3, // current size of pen
    color: 'red', // current color of pen
    goto: [50, 0], // position to move user's pen
    shape: 'bot', // shape to draw at the updated user's pen position
    speed: 5
  },
]

// is something drawn?
// position changed and the pen is down -> yes
// shape is specified -> yes

// what triggers a send?

goto()
goto() // send two messages (one for each goto)

goto()
shape() // send including shape

shape()
shape() // send two messages (one for each shape)

goto()
<any pen or speed modifiers: pen_up, pen_down, speed, color, pen_size> // send goto

// what DOESNT trigger a send?
any pen modifier followed by another pen modifier (just update locally to send in next message)


/**
Client side, we store an array of "instructions" to run for the user as a loop
Each "instruction" is an object which specifies
- is the pen up or down
- what's the pen size
- what's the pen color
- do we draw a shape? (image or circle)
- how many frames do we show this instruction for? i.e. how long do we render it?


To save storage/bandwidth, it only makes sense to register instructions which actually draw things to the screen.
E.g.
if (pen is down || shape is specified) {
  if (pen is down) {
    draw the line
  }
  if (shape is specified) {
    draw the shape
  }
} else {
  nothing to draw...
}


what about the case where the user wants to draw a dashed line? we don't want to take up a frame where the pickup the pen and move it over the gap...
{
  down: true,
  goto: [10, 10]
},
// nothing is drawn in next instruction, it just sets up the cursor for the next line
{
  down: false,
  goto: [20, 20]
},
{
  down: true,
  goto: [30, 30]
}

in the above case, I think we should still draw a "blank" render for the down == false instruction. E.g. what if they wanted a long pause before the next dash?
**/


// RETHINKING EVENTS
events = [
  // these are mutually exclusive:
  // - forward
  // - backward
  // - goto
  // - shape
  {
    penDown: true, // should we draw a line from prev pos to next pos
    penSize: 3, // current size of pen
    color: 'green', // current color of pen
    goto: [10, 0], // exact position to move user's pen
    forward: null,
    backward: null,
    left: null,
    right: null,
    shape: null, // shape to draw at the updated user's pen position
    speed: 5, // how long to draw this before next frame. 10 = 1 frame, 1 = 60 frames
  },
]

// draw a line from prev position to new position
{
  penDown: true,
  goto: [10, 0], // exact position to move user's pen
  penSize: 3,
  color: 'green',
  forward: null,
  backward: null,
  left: null,
  right: null,
  shape: null,
  speed: 5,
}

// draw a shape at cursor position
{
  penDown: true,
  goto: [10, 0], // exact position to move user's pen
  penSize: 3,
  color: 'green',
  forward: null,
  backward: null,
  left: null,
  right: null,
  shape: null,
  speed: 5,
}

// trigger event send on any "moving" or "drawing" event