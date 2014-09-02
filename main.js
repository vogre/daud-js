(function(){
var globals = {};

function mkAnalyser(ctx){
    return ctx.createAnalyser();
}

function mkAudioEnv(){
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var sp = audioCtx.createScriptProcessor(0, 0, 2);
    globals.actx = audioCtx;
    var t = 0;
    globals.x = sp;
    globals.sr = audioCtx.sampleRate;
    return sp;
}

function mkPiano(){
    var a = [];
    for (var i=0; i<88; i++)
        a[i] = Math.pow(2, (i+1-49)/12)*440;
    return a;
}

mpiano = mkPiano();

var active = new Array(12);

function mkInputSys(){
    var line = 'AWSEDFTGYHUJ', kcodes = [];
    for (var i=0; i<line.length; i++)
        kcodes[i] = line.charCodeAt(i);
    document.body.onkeydown = function(e){
        var i = kcodes.indexOf(e.which);
        if (~i && !active[i])
        {
            var n = mpiano[39+i];
            var s = sinconst(n, 0.5);
            var s2 = squareconst(mpiano[40+i], 0.5);
            var m = mul([s, s2], 2);
            var z = whitenoise(0.0, 1);
            var p = mul([sum([m, s]), z]);
            addc(globals.ssum, p);
            active[i] = p;
        }
    };
    document.body.onkeyup = function(e){
        var i = kcodes.indexOf(e.which);
        if (~i && active[i])
        {
            var t = active[i];
            rmg(globals.ggraph, t);
            active[i] = null;
        }
    };
}

function addc(par, c){
    par.n.push(c);
    c.par = par;
}

function rm(arr, it){
    var i = arr.indexOf(it);
    if (i==-1)
        return;
    arr.splice(i, 1);
}

function rmg(arr, it){
    if (it.par)
        rm(it.par.n, it);
    rmgi(arr, it);
}

function rmgi(arr, it){
    rm(arr, it);
    if (!it.n)
        return;
    for (var i=0; i<it.n.length; i++)
        rmgi(arr, it.n[i]);
}

mkInputSys();

var L = [];

function v(n){
    if (n.tm)
        throw new Error('tm');
    if (n.p)
        return;
    n.tm = 1;
    if (n.n)
    {
        for (var i=0; i<n.n.length; i++)
            v(n.n[i]);
    }
    n.p = 'p';
    n.tm = null;
    L.push(n); // unshift in original algorithm
}

function topos(g){
    L = [];
    var i = 0;
    while (i<g.length)
    {
        if (!g[i].p)
            v(g[i]);
        i++;
    }
    for (i=0; i<g.length; i++)
        g[i].p = null;
    return L;
}

document.getElementById('stop').onclick = function(){
    if (globals.x)
    {
        globals.x.disconnect();
        globals.x = null;
    }
};

function reg(n){
    globals.ggraph.push(n);
    globals.vr++;
    return n;
}

function chnode(n){
    var a1 = new Float32Array(globals.x.bufferSize);
    var a2 = new Float32Array(globals.x.bufferSize);
    return reg({
        r: function(){
            for (var i=0; i<a1.length; i++)
            {
                a1[i] = this.n[0][i];
                a2[i] = this.n[0][i];
            }
        },
        n: n,
    });
}

function sinconst(freq, mul, add){
    mul = mul||1;
    var len = 1/freq*globals.sr;
    var a = new Float32Array(len|0);
    for (var i=0; i<a.length; i++)
        a[i] = Math.sin(i/a.length*2*Math.PI)*mul;
    var o = new Float32Array(globals.x.bufferSize);
    var p = 0;
    return reg({
        r: function(){
            for (var i=0; i<o.length; i++)
                o[i] = a[(p+i)%a.length];
            p = (p+o.length)%a.length;
        },
        o: o,
        n: []
    });
}

function sign(a){ return a<0 ? -1 : 1; }

function squareconst(freq, mul, add){
    mul = mul||1;
    var len = 1/freq*globals.sr;
    var a = new Float32Array(len|0);
    for (var i=0; i<a.length; i++)
        a[i] = sign(Math.sin(i/a.length*2*Math.PI))*mul;
    var o = new Float32Array(globals.x.bufferSize);
    var p = 0;
    return reg({
        r: function(){
            for (var i=0; i<o.length; i++)
                o[i] = a[(p+i)%a.length];
            p = (p+o.length)%a.length;
        },
        o: o,
        n: []
    });

}

function sum(n){
    var o = new Float32Array(globals.x.bufferSize);
    return reg({
        r: function(){
            var i, j;
            for (j=0; j<o.length; j++)
                o[j] = 0;
            for (i=0; i<this.n.length; i++)
            {
                var t = this.n[i];
                for (j=0; j<o.length; j++)
                    o[j] += t.o[j];
            }
        },
        o: o,
        n: n,
    });
}

function mul(n, mulconst){
    mulconst = mulconst||1;
    var o = new Float32Array(globals.x.bufferSize);
    return reg({
        r: function(){
            var i, j;
            for (j=0; j<o.length; j++)
                o[j] = mulconst;
            for (i=0; i<this.n.length; i++)
            {
                var t = this.n[i];
                for (j=0; j<o.length; j++)
                    o[j] *= t.o[j];
            }
        },
        n: n,
        o: o,
    });
}

function whitenoise(mulconst, addconst){
    mulconst = mulconst||1;
    var o = new Float32Array(globals.x.bufferSize);
    for (var i=0; i<o.length; i++)
        o[i] = (Math.random()*2-1)*mulconst+addconst;
    return reg({
        r: function(){},
        o: o
    });
}

function upall(){
    if (globals.v != globals.vr)
    {
        globals.topo = topos(globals.ggraph);
        globals.v = globals.vr;
    }
    var o = globals.topo;
    for (var i=0; i<o.length; i++)
        o[i].r();
}

function main(){
    var sp = mkAudioEnv();
    var g = [];
    globals.ggraph = g;
    globals.v = 0;
    globals.vr = 0;
    var sc = sinconst(440, 0.2);
    var sc2 = sinconst(660, 0.2);
    var ssum = sum([]);
    globals.ssum = ssum;
    sp.onaudioprocess = function(e){
        var data = e.outputBuffer.getChannelData(0);
        var data2 = e.outputBuffer.getChannelData(1);
        upall();
        for (var i=0; i<data.length; i++)
        {
            data[i] = globals.ssum.o[i];
            data2[i] = globals.ssum.o[i];
        }
    };
    sp.connect(globals.actx.destination);
}

main();

})();
