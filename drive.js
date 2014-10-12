(function(global){
var daud = global.daud;
var ui = global.ui;

/*global  transform*/
function plotAt(s, name_a, name_b){
    var tmpr = new Float32Array(s.o.length);
    var tmpi = new Float32Array(s.o.length);
    var mag_log = new Float32Array(s.o.length);
    daud._upall();
    ui.plot(s.o, name_a);
    for (i=0; i<daud._defbuf; i++)
    {
        tmpr[i] = s.o[i];
        tmpi[i] = 0;
    }
    transform(tmpr, tmpi);
    for (var i=0; i<daud._defbuf/2; i++)
    {
        // why 10?
        mag_log[i] = Math.log(Math.sqrt(tmpr[i]*tmpr[i]+tmpi[i]*tmpi[i]))/10;
    }
    ui.barPlot(mag_log.subarray(0, daud._defbuf/2), name_b);
}

function m(){
    console.log(daud);
    document.getElementById('stop').onclick = function(){ daud.stopNow(); };
    var patlist = [];
    document.getElementById('pat_toggle').onclick = function(){
        if (patlist.length)
            patlist = [];
        else
            patlist = [daud.repeat(1/4, daud.drum)];
        daud._setPatList(patlist);
    };

    document.getElementById('plot_test').onclick = function(){
        var s = new daud.LOP(1000, 1, daud.sinconst(440, 1));
        plotAt(s, 'canvas_test', 'bar_test');
        daud._rmg(daud._ggraph, s);
        var bzt = daud.adsr([2000, 1], [4000, 0.8],
            [3000, 0.8], [8000, 0], 4000);
        var test_arr_env = [];
        for (var i=0; i<bzt.len(); i++)
        {
            if ((i%daud._defbuf)===0)
                bzt.r();
            test_arr_env.push(bzt.o[i%daud._defbuf]);
        }
        daud._rmg(daud._ggraph, bzt);
        ui.barPlot(test_arr_env, 'env_test');
    };
    ui.create_graph('canvas_test');
    ui.create_graph('bar_test');
    ui.create_graph('env_test');
}

m();
})(window);
