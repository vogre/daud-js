(function(global){
var M = {};
global.daud = M;

var globals = {};
globals.defbuf = 2048;
M._defbuf = globals.defbuf;
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
    console.log('alloc');
    var t = {b: new Float32Array(globals.x.bufferSize), u: true};
    a.push(t);
    return t;
}

function sret(t){ t.u = false; }

function mkAudioEnv(){
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var sp = audioCtx.createScriptProcessor(globals.defbuf, 0, 2);
    globals.actx = audioCtx;
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
M.mkPiano = mkPiano;

var mpiano = mkPiano();

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
M._rmg = rmg;

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
M.ts2sample = ts2sample;

function sample2ts(sample){ return sample/globals.sr; }
M.sample2ts = sample2ts;

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
    var arr = [[0, 0], a, d, s, r, [Infinity, 0]];
    return reg({
        tlist: [a,d,s,r].map(function(t){ return t[0]; }),
        len: function(){
            if (this._len)
                return this._len;
            var t = this.tlist;
            var l = t.reduce(function(a, b){ return a+b; }, 0);
            return (this._len=l+this.tshift);
        },
        tshift: shift,
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
M.adsr = adsr;

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

function stopNow(){
    if (globals.x)
        globals.x.disconnect();
}
M.stopNow = stopNow;

function setPatList(value){ patlist = value; }
M._setPatList = setPatList;

function reg(n){
    globals.ggraph.push(n);
    globals.vr++;
    return n;
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
M.sinconst = sinconst;

function sinvar(freqa, mul, add){
    mul = mul||1;
    add = add||0;
    var ot = sget();
    var o = ot.b;
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
                o[i] = (a + (p-e)*(b-a))*mul+add;
                zp += step;
            }
        },
        o: o,
        ot: ot,
        n: [freqa],
        tagg: 'sinconst'
    });
}
M.sinvar = sinvar;

function getCoeffs(f0, Q){
    var w0 = 2*Math.PI*f0/globals.sr;
    var cos_w0 = Math.cos(w0);
    var sin_w0 = Math.sin(w0);
    var alpha = sin_w0/(2*Q);
    return {w0: w0, cos_w0: cos_w0, sin_w0: sin_w0, Q: Q, alpha: alpha};
}

function sign(a){ return a<0 ? -1 : 1; }// jshint ignore:line

function timer(i, to){
    var z = 0;
    to = ts2sample(to)|0;
    return reg({
        r: function(){
            if (!this.par)
                return;
            z += globals.x.bufferSize;
            if (z > to+globals.x.bufferSize*2)
                rmg(globals.ggraph, this);
        },
        o: i.o,
        n: [i],
        tagg: 'timer',
    });
}
M.timer = timer;

function envtimer(env, i){
    var t = env.tlist;
    var len = t.reduce(function(a, b){ return a+b; }, 0);
    return timer(i, sample2ts(len+env.tshift));
}
M.envtimer = envtimer;

var bpm = 120;
function b2s(b){ return b*4*60/bpm; }
M.b2s = b2s;

function repeat(interval, sfn){
    var time = 0;
    var z = b2s(interval);
    return {
        p: function(t){
            if (t)
                time = t+z;
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
M.repeat = repeat;

function drum(offset){
    var s = sinconst(112, .2);
    var x = sum([s, whitenoise(.2, 0)]);
    var m = new LOP(880, 1, x);
    var env = adsr([2000, 1], [4000, 0.8],
        [3000, 0.8], [8000, 0], ts2sample(offset)|0);
    var tt = mul([env, m]);
    return envtimer(env, tt);
}
M.drum = drum;

var patlist = [];

function mkPatternSystem(){
    return function(time){
        var cur_cyc_end = time+sample2ts(globals.x.bufferSize);
        for (var i=0; i<patlist.length; i++)
        {
            var p = patlist[i];
            if (!p.l)
                p.l = p.p(time);
            if (p.l.t>cur_cyc_end)
                continue;
            addc(globals.ssum, p.l.s(p.l.t-time));
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
M.sum = sum;

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
M.mul = mul;

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
M.whitenoise = whitenoise;

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
M._upall = upall;

function main(){
    mkCos();
    var sp = mkAudioEnv();
    var patSys = mkPatternSystem();
    var g = [];
    globals.ggraph = g;
    M._ggraph = g;
    globals.v = 0;
    globals.vr = 0;
    var test = sinconst(440, 0.1); // jshint ignore:line
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
    sp.connect(globals.actx.destination);
}

function mkCos(){
    globals.ccos = new Float32Array(2049);
    for (var i=0; i<globals.ccos.length; i++)
        globals.ccos[i] = Math.cos(i/2048*2*Math.PI);
}

function BiquadFilter(){
    this.xn_1 = this.xn_2 = 0;
    this.yn_1 = this.yn_2 = 0;
}

BiquadFilter.prototype.doLoop = function(){
    var src = this.src;
    var o = src.o;
    var o2 = this.o;
    var b0 = this.b0, b1 = this.b1, b2 = this.b2;
    var a0 = this.a0, a1 = this.a1, a2 = this.a2;
    var xn_1 = this.xn_1, xn_2 = this.xn_2;
    var yn_1 = this.yn_1, yn_2 = this.yn_2;
    for (var i = 0; i < o.length; i++)
    {
        o2[i] = (b0/a0)*o[i] + (b1/a0)*xn_1 + (b2/a0)*xn_2 -
            (a1/a0)*yn_1 - (a2/a0)*yn_2;
        xn_2 = xn_1;
        xn_1 = o[i];
        yn_2 = yn_1;
        yn_1 = o2[i];
    }
    this.xn_1 = xn_1;
    this.xn_2 = xn_2;
    this.yn_1 = yn_1;
    this.yn_2 = yn_2;
};

function LOP(f, Q, c){
    BiquadFilter.call(this);
    this.f = f;
    this.Q = Q;
    this.src = c;
    this.n = [c];
    this.ot = sget();
    this.o = this.ot.b;
    this.calcCoeffs();
    reg(this);
}

LOP.prototype = Object.create(BiquadFilter.prototype);

LOP.prototype.calcCoeffs = function(){
    var x = getCoeffs(this.f, this.Q);
    this.b0 = (1 - x.cos_w0)/2;
    this.b1 = 1 - x.cos_w0;
    this.b2 = (1 - x.cos_w0)/2;
    this.a0 = 1 + x.alpha;
    this.a1 = -2*x.cos_w0;
    this.a2 = 1 - x.alpha;
};

LOP.prototype.r = function(){
    if (this.hask)
        throw 'not implemented';
    this.doLoop();
};
M.LOP = LOP;

function HP(f, Q, c){
    BiquadFilter.call(this);
    this.f = f;
    this.Q = Q;
    this.src = c;
    this.n = [c];
    this.ot = sget();
    this.o = this.ot.b;
    this.calcCoeffs();
    reg(this);
}

HP.prototype = Object.create(BiquadFilter.prototype);

HP.prototype.calcCoeffs = function(){
    var x = getCoeffs(this.f, this.Q);
    this.b0 = (1 + x.cos_w0)/2;
    this.b1 = -(1 + x.cos_w0);
    this.b2 = (1 + x.cos_w0)/2;
    this.a0 = 1 + x.alpha;
    this.a1 = -2*x.cos_w0;
    this.a2 = 1 - x.alpha;
};

HP.prototype.r = function(){
    if (this.hask)
        throw 'not implemented';
    this.doLoop();
};
M.HP = HP;

function phasor(freq, mul, add){
    mul = mul||1;
    add = add||0;
    var ot = sget();
    var o = ot.b;
    var zp = 0;
    return reg({
        r: function(){
            var step = freq/globals.sr;
            for (var i=0; i<o.length; i++)
            {
                if (zp>1.0)
                    zp = zp % 1;
                o[i] = zp*mul + add;
                zp += step;
            }
        },
        o: o,
        ot: ot,
        n: [],
        tagg: 'sinconst'
    });
}
M.phasor = phasor;

main();

})(window);
