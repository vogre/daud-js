(function(){
var z;
var ctxs = {};

function ini(){
    var c = document.getElementById('c');
    var ctx = c.getContext('2d');
    z = ctx;
}
    
function b(arr_fn){
    ini();
    anim(function(){
        var a = arr_fn();
        z.moveTo(0, 0);
        for (var i=0; i<a.length; i++) 
        {
            z.lineTo(i, a[i]);
        }
    });
}
    
var anim = function(f){
    var stopper = {stop: false};
    function ai(){
        f();
        if (!stopper.stop)
            requestAnimationFrame(ai);
    }
    requestAnimationFrame(ai);
    return stopper;
}

function get_ctx(name){
    if (name in ctxs)
        return ctxs[name];
    var c = document.getElementById(name);
    ctxs[name] = c.getContext('2d');
    return ctxs[name];
}

function ctxInit(ctx, min){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    var height = ctx.canvas.height;
    var width = ctx.canvas.width;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(0, (min+2)*height/2);
    // looks better with scale(1, -1) instead of scale(step, -height/2)
    ctx.scale(1, -1);
}

function do_plot(arr, name, min, max){
    min = -1;
    max = 1;
    var ctx = get_ctx(name);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    var height = ctx.canvas.height;
    var width = ctx.canvas.width;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(0, height/2);
    ctx.scale(1, -1);
    var step = width / arr.length;
    ctx.beginPath();
    ctx.moveTo(0, arr[0]*height/2);
    for (var i = 0; i < arr.length; i++)
        ctx.lineTo(i*step, arr[i]*height/2);
    ctx.stroke();
}

function do_plot_bar(arr, name, min, max){
    function getArrPos(j){ return arr.length/width*j|0; }
    var min = 0;
    max = 1;
    var min_bar_size = 2;
    var ctx = get_ctx(name);
    ctxInit(ctx, min);
    var height = ctx.canvas.height;
    var width = ctx.canvas.width;
    ctx.beginPath();
    for (var i = 0; i < width; i++)
    {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, arr[getArrPos(i)]*height);
        ctx.stroke();
    }
}

function create_graph(id){
    var d = document.createElement('div');
    var c = document.createElement('canvas');
    c.id = id;
    c.width = c.height = 200;
    d.appendChild(c);
    d.appendChild(document.createTextNode(id));
    document.body.appendChild(d);
}

self.ui = {
    saya: function(){
        console.log('A');
    },
    plot: do_plot,
    barPlot: do_plot_bar,
    create_graph: create_graph,
};

})();
