// everyone at the party, including ourselves
var visitors = {};

// our ID. our data is saved in visitors[myID]
// ( other visitors have their own ID, and their data is saved in visitors too )
var myID;

//////////////////////////////////////////////////////////////////
// LET'S GET THIS PARTY STARTED //////////////////////////////////
//////////////////////////////////////////////////////////////////

$(document).ready(function() {
    // where the party's at. where we will draw everyone
    var $main_content = document.getElementById("main-content");

    // hammertime helps us deal with mouse clicks and touch screen events
    hammertime = Hammer($main_content, {
        prevent_default: true,
        no_mouseevents: true
    })
    .on('touch', function(event){
        touchActivate(event);
    })
    .on('drag', function(event){
        touchActivate(event);
    })
    .on('release', function(event){
        touchDeactivate();
    });

    drawVisitors();
});


//////////////////////////////////////////////////////////////////
// DRAWING EVERYONE //////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

function drawVisitors(){
    for (var ID in visitors) {
        var visitor = visitors[ID];

        // if this visitor doesn't have an HTML element yet, make one for them
        if ($('#visitor_'+ID).length === 0) {
            $('#main-content').append('<span class="visitor" id="visitor_'+ID+'"></span>');
        }

        // update the visitor's CSS
        $('#visitor_'+ID).css({
            'left' : visitor.x*$(window).width()-20 + 'px',
            'top' : visitor.y*$(window).height()-20 + 'px',
            'background-color': visitor.color,
            'opacity' : '0.7'
        });
    }

    // keep asking the window to draw again and again
    window.requestAnimationFrame(drawVisitors);
}

//////////////////////////////////////////////////////////////////
// MOVING AROUND /////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

// whether we are clicking or touching the screen
var pressed;

// update our location based on mouse clicks or touchscreen events
var touchActivate = function(event){
    // the event variable gives us information about the mouse click or touch
    // screen event. mostly we care about where we are clicking or touching the
    // screen because that's how we tell our avatar to move there.

    // if we don't have an ID yet, we aren't allowed to do anything.
    // ( we get an ID once we connect with the server )
    if (myID === undefined) {
        return; // this exits this function
    }

    console.log('touchActivate');

    pressed = true;

    // where the click or touch is happening
    var c = event.gesture.center;
    var x = c.pageX;
    var y = c.pageY;

    // ratios, so other people can draw our location on multiple screen sizes
    // so like instead of saying "we are 200px to the right", we'd say "we are
    // halfway across the screen", so people can know where to draw us on THEIR
    // screen even if their screen is a different size than ours
    var xRatio = x/$(window).width();
    var yRatio = y/$(window).height();
    var data = {
        x: xRatio,
        y: yRatio,
        color: visitors[myID].color
    };
    updateVisitor(myID, data);

    // share our location with everyone else at the party, so they can see us
    // on their screen too!
    share_my_data();
}

var touchDeactivate = function(){
    console.log('touchDeactivate');
    pressed = false;
}

var updateVisitor = function(ID, data){
    console.log('updateVisitor');

    if (visitors[ID] === undefined) {
        visitors[ID] = {};
    }

    visitors[ID].x = data.x;
    visitors[ID].y = data.y;
    visitors[ID].color = data.color;
};

//////////////////////////////////////////////////////////////////
// COMMUNICATING WITH OTHER PARTIERS /////////////////////////////
//////////////////////////////////////////////////////////////////

// socket is the way we communicate with the server. everyone else at the party
// is also talking to the same server, so that's how we communicate with other
// people at the party.
var socket = io.connect('http://'+window.location.hostname);

socket.on('connect',function(){
    console.log('socket connect');

    myID = socket.socket.sessionid;
    console.log(myID);

    // we add ourselves to the list of visitors
    visitors[myID] = {};
    visitors[myID].color = get_random_bright_color();
});

// this tells us that one of the other people has moved, so we want to update
// their location
socket.on('move', function (data) {
    console.log('socket "move" message got data', data);
    updateVisitor(data.ID, data);
});

socket.on('close', function (ID) {
    console.log('socket close');
    console.log('disconnect ' + ID);
    $('#visitor_'+ID).remove();
});

//////////////////////////////////////////////////////////////////
// HOW TO TELL EVERYONE ELSE WHERE WE ARE ////////////////////////
// so they can draw us too ///////////////////////////////////////
//////////////////////////////////////////////////////////////////

// the last point in time when we shared our data
var time = (new Date()).getTime();
function share_my_data() {
    console.log('share_my_data');

    var me = visitors[myID];
    var my_data = {
        x: me.x,
        y: me.y,
        color: me.color,
        ID: myID
    }

    // we try to share out only when necessary, otherwise there would be too
    // many messages and things would get jammed and laggy. so, we see what
    // time it is now, and compare that to when we last shared out. we only
    // share out at most every 40 milliseconds. also, we only share out when
    // we are actively moving around (when "pressed" is true)
    var now = (new Date()).getTime();
    if ( pressed && (now-time>40) ) {
        socket.emit('move', my_data);
        time = (new Date()).getTime();
    }
    return true;
}

//////////////////////////////////////////////////////////////////
// CHOOSING PRETTY COLORS ////////////////////////////////////////
//////////////////////////////////////////////////////////////////

function get_random_bright_color() {
    var HSVcolor = hsvToRgb(Math.random(),1,1);
    var RGBcolor = 'rgb(' + HSVcolor.join(',') + ')';
    return RGBcolor;
}

function hsvToRgb(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}
