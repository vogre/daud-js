(function(){
var globals = {};
globals.mem = [];

function sget(){
    var a = globals.mem, l = a.length;
    for (var i=0; i<l; i++)
    {
        if (!a[i].u)
        {
            a[i].u = true;
            return a[i];
        }
    }
    var t = {b: new Float32Array(globals.x.bufferSize), u: true};
    a.push(t);
    return t;
}

function sret(t){ t.u = false; }

function mkAnalyser(ctx){
    return ctx.createAnalyser();
}

function mkAudioEnv(){
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var sp = audioCtx.createScriptProcessor(2048, 0, 2);
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
            var s2 = sinconst(mpiano[44+i], 0.5);
            var boo = sinvar(sinconst(100, 91, 100), 0.4);
            var m = mul([s, s2], 1);
            // var z = whitenoise(0.0, 1);
            var p = mul([sum([m, boo]), adsr([8000, 1], [1000, 0.8],
                [2100, 0.8], [30100, 0])]);
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
    globals.vr++;
    if (it.par)
        rm(it.par.n, it);
    rmgi(arr, it);
}

function rmgi(arr, it){
    rm(arr, it);
    if (it.ot)
        sret(it.ot);
    if (!it.n)
        return;
    for (var i=0; i<it.n.length; i++)
        rmgi(arr, it.n[i]);
}

function ts2sample(ts){ return ts*globals.sr; }

function sample2ts(sample){ return sample/globals.sr; }

// [[0,0], [100, 1], [200, 0.5], [220, 0]]
function lenv(levels){
    var t = ts2samp(levels[levels.length-1][0])|0;
    var a = new Float32Array(t);
}

function adsr(a, d, s, r, shift){
    shift = shift||0;
    var ot = sget();
    var o = ot.b;
    var pos = 0;
    var state = 0;
    var state_start = 0.0;
    var next_state = shift;
    var state_pos = 0;
    var m = 0.0;
    var arr = [[0, shift], a, d, s, r, [Infinity, 0]];
    return reg({
        r: function(){
            for (var i=0; i<o.length; i++)
            {
                if (pos+i==next_state)
                {
                    state++;
                    var tprev = arr[state-1];
                    var tcur = arr[state];
                    state_start = tprev[1];
                    state_pos = pos+i;
                    next_state = next_state+tcur[0];
                    m = (tcur[1]-tprev[1])/tcur[0];
                }
                o[i] = state_start+m*(pos+i-state_pos);
            }
            pos+=i;
        },
        o: o,
        tagg: 'adsr',
        ot: ot,
    });
}

function pattern(){

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

document.getElementById('plot_test').onclick = function(){
    var test_arr = [], test_arr2 = [];
    var s = lop(1200, 2, whitenoise(1, 0));
    var tmpr = new Float32Array(s.o.length);
    var tmpi = new Float32Array(s.o.length);
    s.r();
    for (i=0; i<2048; i++)
    {
        test_arr.push(s.o[i]);
        tmpr[i] = s.o[i];
        // tmpr[i] = Math.cos(i/(44100/440)*Math.PI*2);
        tmpi[i] = 0;
    }
    ui.plot(test_arr, 'canvas_test');
    transform(tmpr, tmpi);
    var maxIndex = 0;
    var max = 0;
    for (var i=0; i<2048; i++)
    {
        // why 10?
        test_arr2[i] = Math.log(Math.sqrt(tmpr[i]*tmpr[i]+tmpi[i]*tmpi[i]))/10;
        if (test_arr2[i]>max)
        {
            max = test_arr2[i];
            maxIndex = i;
        }
    }
    console.log('MAX', max, maxIndex);
    ui.barPlot(test_arr2.slice(0, 1024), 'bar_test');
    rmg(globals.ggraph, s);
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
    add = add||0;
    var ot = sget();
    var o = ot.b;
    var zp = 0.75;
    return reg({
        r: function(){
            var step = freq/globals.sr;
            for (var i=0; i<o.length; i++)
            {
                if (zp>1.0)
                    zp = zp % 1;
                var e = 2048*zp;
                var p = e|0;
                var a = globals.ccos[p];
                var b = globals.ccos[p+1];
                o[i] = (a + (p-e)*(b-a))*mul+add;
                zp += step;
            }
        },
        o: o,
        ot: ot,
        n: [],
        tagg: 'sinconst'
    });
}

function sinvar(freqa, mul, add){
    mul = mul||1;
    var ot = sget();
    var o = ot.b;
    var p = 0;
    var zp = 0;
    return reg({
        r: function(){
            for (var i=0; i<o.length; i++)
            {
                var step = freqa.o[i]/globals.sr;
                if (zp>1.0)
                    zp = zp % 1;
                var e = 2048*zp;
                var p = e|0;
                var a = globals.ccos[p];
                var b = globals.ccos[p+1];
                o[i] = (a + (p-e)*(b-a))*mul;
                zp += step;
            }
        },
        o: o,
        ot: ot,
        n: [freqa],
        tagg: 'sinconst'
    });
}

function sinlookup(){

}

function lookup(){

}

function getCoeffs(f0, Q){
    var w0 = 2*Math.PI*f0/globals.sr;
    var cos_w0 = Math.cos(w0);
    var sin_w0 = Math.sin(w0);
    var alpha = sin_w0/(2*Q);
    return {w0: w0, cos_w0: cos_w0, sin_w0: sin_w0, Q: Q, alpha: alpha};
}

function biquadLoop(o, o2, b0, b1, b2, a0, a1, a2){
    var yn_1 = 0;
    var yn_2 = 0;
    var xn_1 = 0;
    var xn_2 = 0;
    for (var i = 0; i < o.length; i++)
    {
        o2[i] = (b0/a0)*o[i] + (b1/a0)*xn_1 + (b2/a0)*xn_2 -
            (a1/a0)*yn_1 - (a2/a0)*yn_2;
        xn_2 = xn_1;
        xn_1 = o[i];
        yn_2 = yn_1;
        yn_1 = o2[i];
    }
    console.log(o2);
}

function lop(f, Q, c){
    var x = getCoeffs(f, Q);
    var b0 = (1 - x.cos_w0)/2;
    var b1 = 1 - x.cos_w0;
    var b2 = (1 - x.cos_w0)/2;
    var a0 = 1 + x.alpha;
    var a1 = -2*x.cos_w0;
    var a2 = 1 - x.alpha;
    console.log(b0, b1, b2, a0, a1, a2);
    var ot = sget();
    var o = ot.b;
    return reg({
        r: function(){
            biquadLoop(c.o, o, b0, b1, b2, a0, a1, a2);
        },
        o: o,
        ot: ot,
        n: [c],
        tagg: 'lop'
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

function timer(i, to){
    var z = 0;
    var tt = (Math.random()*100).toFixed();
    to = ts2sample(to);
    return reg({
        r: function(){ 
            if (!this.par)
                return;
            z += globals.x.bufferSize;
            if (z > to)
                rmg(globals.ggraph, this);
        },
        o: i.o,
        n: [i],
        tagg: 'timer',
    });
}

var bpm = 120;
function b2s(b){ return b*4*60/bpm; }

function repeat(interval, sfn){
    var time = 0;
    var z = b2s(interval);
    return {
        p: function(t){
            var _t = {
                t: time,
                s: sfn,
            };
            time += z;
            return _t;
        },
        l: null
    };
}

function drum(){
    var s = sinconst(110+Math.random()*210|0, .2);
    var x = sum([s, whitenoise(.01, 0)]);
    var tt = mul([adsr([1000, 1], [2000, 0.8],
        [2000, 0.8], [3000, 0]), x]);
    return timer(tt, 0.2);
}

var patlist = []||[repeat(1/4, drum)];

function mkPatternSystem(){
    var last = 0;
    return function(time){
        var cur_cyc_end = time+sample2ts(globals.x.bufferSize);
        var xx = ts2sample(time);
        var diff = xx-last;
        last = xx;
        var offset = Math.abs(diff - globals.x.bufferSize);
        for (var i=0; i<patlist.length; i++)
        {
            var p = patlist[i];
            if (!p.l)
                p.l = p.p();
            if (p.l.t>cur_cyc_end)
                continue;
            addc(globals.ssum, p.l.s());
            p.l = p.p();
        }
    };
}

function sum(n){
    var ot = sget();
    var o = ot.b;
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
        ot: ot,
        n: n,
        tagg: 'sum'
    });
}

function mul(n, mulconst){
    mulconst = mulconst||1;
    var ot = sget();
    var o = ot.b;
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
        ot: ot,
        tagg: 'mul',
    });
}

function whitenoise(mulconst, addconst){
    mulconst = mulconst||1;
    var ot = sget();
    var o = ot.b;
    for (var i=0; i<o.length; i++)
        o[i] = (Math.random()*2-1)*mulconst+addconst;
    return reg({
        r: function(){},
        o: o,
        ot: ot,
        tag: 'whitenoise'
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

function periodic(){

}

function id(a){ return a; }

function main(){
    mkCos();
    var sp = mkAudioEnv();
    var analyser = mkAnalyser(globals.actx);
    var patSys = mkPatternSystem();
    var g = [];
    globals.ggraph = g;
    globals.v = 0;
    globals.vr = 0;
    var test = sinconst(440, 0.1);
    var ssum = sum([]);
    globals.ssum = ssum;
    sp.onaudioprocess = function(e){
        patSys(e.playbackTime);
        var data = e.outputBuffer.getChannelData(0);
        var data2 = e.outputBuffer.getChannelData(1);
        upall();
        for (var i=0; i<data.length; i++)
        {
            data[i] = globals.ssum.o[i];
            data2[i] = globals.ssum.o[i];
        }
    };
    sp.connect(analyser);
    sp.connect(globals.actx.destination);
    ui.saya();
    ui.create_graph('canvas_test');
    ui.create_graph('bar_test');
}

function mkCos(){
    globals.ccos = new Float32Array(2049);
    for (var i=0; i<globals.ccos.length; i++)
        globals.ccos[i] = Math.cos(i/2048*2*Math.PI);
}

function fftf(){
    
}

function BilinearFilter(){
    this.xn_1 = this.xn_2 = 0;
    this.yn_1 = this.yn_2 = 0;
}

BilinearFilter.prototype.doLoop = function(){
    var src = this.src;
    var dst = this.o;
    var b0 = this.b0, b1 = this.b1, b2 = this.b2;
    var a0 = this.a0, a1 = this.a1, a2 = this.a2;
    for (var i = 0; i < src.length; i++)
    {

    }
}

main();

})();
