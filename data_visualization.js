//常量区
const margin = { top: 20, right: 100, bottom: 30, left: 40 };
const plotWidth = 300;
const plotHeight = 300;
const gap = 50;
const totalWidth = plotWidth * 2 + gap + margin.left + margin.right;
const totalHeight = plotHeight * 2 + gap + margin.top + margin.bottom;
// 衰变图：独立高度（2x2网格，不与其他图重叠）
const decayTotalHeight = totalHeight; 

//辅助函数：计算实验1和实验3的单个被试平均值 + 全局平均值
function getAverageImPa(data) {
    if (!data || data.length === 0) return [];
    // 获取当前数据集统一的delay值（raw_data_im/pa都是单一delay）
    const fixedDelay = data[0].delay;
    
    // 单个被试平均值
    const groupedByName = d3.group(data, d => d.name)
    const ssAverages = Array.from(groupedByName, ([name, nameItems]) => {
        const groupedByInput = d3.group(nameItems, d => d.input);
        return Array.from(groupedByInput, ([input, inputItems]) => ({
            name: name,
            input: input,
            output: d3.mean(inputItems, d => d.output),
            delay: inputItems[0].delay
        }));
    }).flat();

    // 全局平均值（修复：手动添加统一delay字段）
    const globalInputGroup = d3.group(data, d => d.input);
    const globalAverageData = Array.from(globalInputGroup, ([input, inputItems]) => ({
        name: 'average',
        input: input,
        output: d3.mean(inputItems, d => d.output),
        delay: fixedDelay 
    }));
    
    return [...ssAverages, ...globalAverageData];
}
//辅助函数：计算实验4的单个被试平均值 + 全局平均值
function getAverageDe(data){
    if (!data || data.length === 0) return [];
    const groupedByName = d3.group(data, d => d.name);
    const ssAverages = Array.from(groupedByName, ([name, nameItems]) => {
        const groupedByInputDelay = d3.group(nameItems, d => d.input, d => d.delay);
        return Array.from(groupedByInputDelay, ([input, delayGroup]) => 
            Array.from(delayGroup, ([delay, items]) => ({
                name: name,
                input: input,
                output: d3.mean(items, d => d.output),
                delay: delay // 保留真实delay
            }))
        ).flat();
    }).flat();

    const globalGroup = d3.group(data, d => d.input, d => d.delay);
    const globalAverageData = Array.from(globalGroup, ([input, delayGroup]) => 
        Array.from(delayGroup, ([delay, items]) => ({
            name: 'average',
            input: input,
            output: d3.mean(items, d => d.output),
            delay: delay
        }))
    ).flat();
    return [...ssAverages, ...globalAverageData];
}
//辅助函数：空/缺失数据=NaN
function safeNum(n){
    if (n === '' || n === null) return NaN;
    return +n;
}

//解析csv，字符串转数字
function coerceRows(data) {
    data.forEach(d => {
        d.input = safeNum(d.input);
        d.output = safeNum(d.output);
        d.delay = safeNum(d.delay);
        d.name = String(d.name ?? '').trim();
    });
    return data;
}

function setStatus(text) {
    const el = document.getElementById('status-text');
    if (el) el.textContent = text;
}

function clearCharts() {
    d3.select("#subjects").selectAll("*").remove();
}

async function readCsvFiles(files) {
    const list = Array.from(files || []);
    const texts = await Promise.all(list.map(f => f.text()));
    const parsed = texts.flatMap((t) => d3.csvParse(t));
    return coerceRows(parsed);
}

function renderAll(data) {
    clearCharts();
    if (!data || data.length === 0) {
        setStatus("未加载到有效数据。请上传 CSV。");
        return;
    }

    // ======= 按实验分组 =======
    const subjectsRoot = document.getElementById('subjects');
    if (!subjectsRoot) {
        setStatus("页面缺少容器（subjects）。");
        return;
    }

    const safeId = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, "_") || "unknown";

    // 实验1（全部报告法）：delay = 65537
    const raw_data_im = d3.filter(data, (item) => item.delay == 65537);

    // 实验3（部分报告法）：delay = 0
    const raw_data_pa = d3.filter(data, (item) => item.delay == 0);

    // 实验4（时间延迟）：3x3(input=9) 且 delay ∈ {-0.1, 0.3, 0.5, 1.0}
    const exp4DelaySet = new Set([-0.1, 0.3, 0.5, 1.0]);
    const raw_data_de = d3.filter(data, (item) => item.input == 9 && exp4DelaySet.has(item.delay));

    // 得到每个被试的平均值和所有人的平均值数据集
    const data_im = getAverageImPa(raw_data_im);
    const data_pa = getAverageImPa(raw_data_pa);
    const data_de = getAverageDe(raw_data_de);

    //画单个图表的函数
    function drawEachImPa(container, name, data, x, y){
        const safeData = Array.isArray(data) ? data : [];
        const grouped = d3.group(safeData, d => d.delay);
        const im_data = (grouped.get(65537) || []).slice();
        const pa_data = (grouped.get(0) || []).slice();
        //为了画折线需要排序
        im_data.sort((a, b) => a.input - b.input);
        pa_data.sort((a, b) => a.input - b.input);


        const g = container.append('g')
            .attr('transform', `translate(${x}, ${y})`);
    
        //x轴y轴
        const xScale = d3.scaleLinear()
            .domain([0, 12])
            .range([0, plotWidth])
        // Y轴保持原有逻辑不变
        const yScale = d3.scaleLinear()
            .domain([0, 12])
            .range([plotHeight, 0]);

        //按照论文，添加了y=x的标准线
        const standardLine = d3.line()
            .x(d => xScale(d))
            .y(d => yScale(d));
        const standardPoints = [0, 12];
        g.append('path')//实例化
            .attr('d', standardLine(standardPoints))
            .attr('fill', 'none')
            .attr('stroke', '#ff7f0e')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4 2');

        //全部报告法实验数据的线
        const im_line = d3.line()
            .x(d => xScale(d.input))
            .y(d => yScale(d.output))
            .defined(d => !isNaN(d.output));
        if (im_data.length > 0) {
            g.append('path')//实例化
                .attr('d', im_line(im_data))
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 2);
            //实验数据的点
            g.selectAll('.circle-im')
                .data(im_data)
                .enter()
                .append('circle')
                .attr('class', 'circle-im')
                .attr('cx', d => xScale(d.input))
                .attr('cy', d => yScale(d.output))
                .attr('r', 3)
                .attr('fill', 'steelblue')
                .attr('title', d => `input:${d.input} output:${d.output}`)
                //鼠标悬浮显示具体数值
                .on('mouseover', function(e, d) {
                    d3.select(this).attr('r', 6);
                    // 文字显示在点正下方
                    g.append('text')
                        .attr('class', 'tip')
                        .attr('text-anchor', 'middle')  // 水平居中
                        .attr('x', xScale(d.input))
                        .attr('y', yScale(d.output) + 15) // 向下偏移
                        .text(`input: ${d.input}, output: ${d.output.toFixed(2)}`);
                })
                .on('mouseout', function() {
                    d3.select(this).attr('r', 3);
                    d3.selectAll('.tip').remove();
                });
        }

        //部分报告法实验数据的线
        const pa_line = d3.line()
            .x(d => xScale(d.input))
            .y(d => yScale(d.output))
            .defined(d => !isNaN(d.output));
        if (pa_data.length > 0) {
            g.append('path')//实例化
                .attr('d', pa_line(pa_data))
                .attr('fill', 'none')
                .attr('stroke', 'red')
                .attr('stroke-width', 2);
            //实验数据的点
            g.selectAll('.circle-pa')
                .data(pa_data)
                .enter()
                .append('circle')
                .attr('class', 'circle-pa')
                .attr('cx', d => xScale(d.input))
                .attr('cy', d => yScale(d.output))
                .attr('r', 3)
                .attr('fill', 'red')
                //鼠标悬浮显示具体数值
                .on('mouseover', function(e, d) {
                    d3.select(this).attr('r', 6);
                    // 文字显示在点正下方
                    g.append('text')
                        .attr('class', 'tip')
                        .attr('text-anchor', 'middle')  // 水平居中
                        .attr('x', xScale(d.input))
                        .attr('y', yScale(d.output) + 15) // 向下偏移
                        .text(`input: ${d.input}, output: ${d.output.toFixed(2)}`);
                })
                .on('mouseout', function() {
                    d3.select(this).attr('r', 3);
                    d3.selectAll('.tip').remove();
                });
        }
        
        //我们实验只会出现这几个值
        const xTickValues = [6, 8, 9, 12];
        g.append('g')
            .attr('transform', `translate(0, ${plotHeight})`)
            .call(d3.axisBottom(xScale).tickValues(xTickValues))
            .style('font-size', '12px');
        g.append('g')
            .call(d3.axisLeft(yScale).ticks(6))
            .style('font-size', '12px');

        //图例区（Ss的名字）
        g.append('text')
            .attr('x', plotWidth - 150)
            .attr('y', 40)
            .attr('text-anchor', 'end')
            .style('font-size', '20px')
            .style('fill', '#6f00ff')
            .text(name);
    }

    function drawEachDecay(container, name, de_data, im_data, x, y){
        if (!de_data || de_data.length === 0) {
        console.warn(`衰变图【${name}】无数据`);
        return;
        }
        //只要3x3矩阵的
        im_data = im_data?.filter(item => item.input == 9) || [];
        de_data = [...(de_data || [])].sort((a,b) => (a.delay || 0) - (b.delay || 0));
        const g = container.append('g')
            .attr('transform', `translate(${x}, ${y})`);

        //x轴y轴 论文里图有两条y轴，左边是正确数目右边是正确率
        const xScale = d3.scaleLinear()
            .domain([-0.15, 1.25])//稍微大一点留点空隙
            .range([0, plotWidth])
        const yScaleLeft = d3.scaleLinear()
            .domain([0, 9])
            .range([plotHeight, 0])
        const yScaleRight = d3.scaleLinear()
            .domain([0, 100])
            .range([plotHeight, 0])

        //按照论文，添加了x=0的标准线
        g.append('line')
            .attr('x1', xScale(0)).attr('x2', xScale(0))
            .attr('y1', yScaleLeft(0)).attr('y2', yScaleLeft(9))
            .attr('stroke','#ff7f0e').attr('stroke-width',2).attr('stroke-dasharray','4 2');

        //实验数据的线
        const line = d3.line()
            .x(d => xScale(d.delay))
            .y(d => yScaleLeft(d.output))
            .defined(d => !isNaN(d.output));;
        g.append('path')//实例化
            .attr('d', line(de_data))
            .attr('fill', 'none')
            .attr('stroke', 'red')
            .attr('stroke-width', 2);
        //实验数据的点
        g.selectAll('.circle')
            .data(de_data)
            .enter()
            .append('circle')
            .attr('class', 'circle')
            .attr('cx', d => xScale(d.delay))
            .attr('cy', d => yScaleLeft(d.output))
            .attr('r', 3)
            .attr('fill', 'red')
            //鼠标悬浮显示具体数值
            .on('mouseover', function(e, d) {
                d3.select(this).attr('r', 6);
                // 文字显示在点正下方
                g.append('text')
                    .attr('class', 'tip')
                    .attr('text-anchor', 'middle')  // 水平居中
                    .attr('x', xScale(d.delay))
                    .attr('y', yScaleLeft(d.output) + 15) // 向下偏移
                    .text(`delay: ${d.delay}, output: ${d.output.toFixed(2)}`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 3);
                d3.selectAll('.tip').remove();
            });
        
        //补充各个轴的特征并实例化
        const xTickValues = [-0.1, 0, 0.15, 0.3, 0.5, 1.0];
        const yTickValuesLeft = [2, 4, 6, 8, 9];
        const yTickValuesRight = [0, 25, 50, 75, 100];
        g.append('g')
            .attr('transform', `translate(0, ${plotHeight})`)
            .call(d3.axisBottom(xScale).tickValues(xTickValues))
            .style('font-size', '12px');
        g.append('g')
            .call(d3.axisLeft(yScaleLeft).tickValues(yTickValuesLeft))
            .style('font-size', '12px');
        g.append('g')
            .attr('transform', `translate(${plotWidth}, 0)`) 
            .call(d3.axisRight(yScaleRight).tickValues(yTickValuesRight))
            .style('font-size', '12px');

        //添加左右柱子（右代表全部报告法在3x3下能报告出的平均值）
        g.append('rect')
            .attr('x', xScale(-0.05))
            .attr('width', xScale(0) - xScale(-0.05))
            .attr('y', yScaleLeft(1))
            .attr('height', plotHeight - yScaleLeft(1))
            .attr('fill', '#000')
        const imValue = (im_data.length > 0 && !isNaN(im_data[0].output)) ? im_data[0].output : 0;
        const imValuePercentage = (imValue / 9) * 100
        g.append('rect')
            .attr('x', xScale(1.18))
            .attr('width', xScale(1.23) - xScale(1.18))
            .attr('y', yScaleLeft(imValue))
            .attr('height', plotHeight - yScaleLeft(imValue))
            .attr('fill', '#000')
            .on('mouseover', function(e){
                d3.select(this).style('opacity', 0.7);
                const rectX = xScale(1.18);
                const rectW = xScale(1.23) - xScale(1.18);
                const centerX = rectX + rectW / 2;
                g.append('text')
                    .attr('class', 'tip')
                    .attr('text-anchor', 'middle')
                    .attr('x', centerX)
                    .attr('y', yScaleLeft(imValue) - 15)
                    .attr('font-size', '12px')
                    .attr('fill', '#000')
                    .text(`Immediate-Memory正确率: ${imValuePercentage.toFixed(2)}%`)
            })
            .on('mouseout', function(){
                d3.select(this).style('opacity', 1);
                d3.selectAll('.tip').remove();
            });
        //图例区（Ss的名字）
        g.append('text')
            .attr('x', plotWidth - 150)
            .attr('y', 40)
            .attr('text-anchor', 'end')
            .style('font-size', '20px')
            .style('fill', '#6f00ff')
            .text(name);
    }

    const getNames = (rows) =>
        Array.from(new Set((rows || []).map(r => r.name).filter(Boolean)))
            .filter(n => n !== 'average')
            .sort((a, b) => a.localeCompare(b));

    const exp1Names = getNames(raw_data_im);
    const exp3Names = getNames(raw_data_pa);
    const exp4Names = getNames(raw_data_de);

    const addSection = (title, subtitle) => {
        const section = document.createElement('div');
        section.className = 'subject';
        section.innerHTML = `
            <div class="subject-title">${title}</div>
            ${subtitle ? `<div class="small" style="color:#555; margin:-4px 0 10px 0;">${subtitle}</div>` : ``}
            <div class="charts" data-section-body></div>
        `;
        subjectsRoot.appendChild(section);
        return section.querySelector('[data-section-body]');
    };

    const addSingleChartCard = (parent, name, containerId, chartTitle) => {
        const card = document.createElement('div');
        card.className = 'chart-card';
        card.innerHTML = `
            <div class="chart-title">${chartTitle} · ${name}</div>
            <div id="${containerId}"></div>
        `;
        parent.appendChild(card);
    };

    // ==== 实验1：全部报告法（每个被试一张图）====
    const body1 = addSection("实验1（全部报告法）", "delay=65537；每个被试一张 input→output 图");
    const data_im_byName = d3.group(data_im, d => d.name);
    const exp1Keys = ['average', ...exp1Names];
    for (const key of exp1Keys) {
        const showName = (key === 'average') ? 'Average' : key;
        const id = `exp1_${safeId(key)}`;
        addSingleChartCard(body1, showName, id, "Experiment 1");
        const svg = d3.select(`#${id}`).append('svg').attr('width', totalWidth).attr('height', totalHeight);
        drawEachImPa(svg, showName, data_im_byName.get(key), margin.left, margin.top);
    }

    // ==== 实验3：部分报告法（每个被试一张图）====
    const body3 = addSection("实验3（部分报告法）", "delay=0；每个被试一张 input→output 图");
    const data_pa_byName = d3.group(data_pa, d => d.name);
    const exp3Keys = ['average', ...exp3Names];
    for (const key of exp3Keys) {
        const showName = (key === 'average') ? 'Average' : key;
        const id = `exp3_${safeId(key)}`;
        addSingleChartCard(body3, showName, id, "Experiment 3");
        const svg = d3.select(`#${id}`).append('svg').attr('width', totalWidth).attr('height', totalHeight);
        drawEachImPa(svg, showName, data_pa_byName.get(key), margin.left, margin.top);
    }

    // ==== 实验4：时间延迟（每个被试一张图）====
    const body4 = addSection("实验4（时间延迟）", "input=9 且 delay∈{-0.1,0.3,0.5,1.0}；每个被试一张 decay 图");
    const data_de_byName = d3.group(data_de, d => d.name);
    const data_im_avg_byName = d3.group(data_im, d => d.name); // 用于右侧柱子（实验1的3x3平均）
    const exp4Keys = ['average', ...exp4Names];
    for (const key of exp4Keys) {
        const showName = (key === 'average') ? 'Average' : key;
        const id = `exp4_${safeId(key)}`;
        addSingleChartCard(body4, showName, id, "Experiment 4");
        const svg = d3.select(`#${id}`).append('svg').attr('width', totalWidth).attr('height', decayTotalHeight);
        drawEachDecay(svg, showName, data_de_byName.get(key), data_im_avg_byName.get(key), margin.left, margin.top);
    }
}

function initUploader() {
    const picker = document.getElementById('csv-picker');
    const clearBtn = document.getElementById('clear-btn');

    if (!picker) {
        setStatus("页面缺少文件选择控件（csv-picker）。");
        return;
    }

    picker.addEventListener('change', async () => {
        try {
            setStatus("正在读取 CSV…");
            const data = await readCsvFiles(picker.files);
            const uniqueNames = new Set(data.map(d => d.name).filter(Boolean));
            setStatus(`已加载 ${data.length} 行数据（被试数：${uniqueNames.size}）。`);
            renderAll(data);
        } catch (e) {
            console.error(e);
            setStatus("读取失败：请确认 CSV 格式正确。");
            clearCharts();
        }
    });

    clearBtn?.addEventListener('click', () => {
        picker.value = "";
        clearCharts();
        setStatus("已清空。请重新选择 CSV。");
    });

    setStatus("请选择一个或多个 CSV 文件。");
}

initUploader();