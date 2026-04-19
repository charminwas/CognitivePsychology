// ======================
// 1. 全局配置
// ======================
const TARGET_PLOT_SIZE = 310;        // 图的大小
const margin = { top: 20, right: 25, bottom: 20, left: 25 };

// 分开控制：水平间距大一点，垂直间距小一点
const gapH = 150;    // 水平间距（列之间）
const gapV = 55;    // 垂直间距（行之间） 👈 调小这里

// 画布宽度：几乎贴边
const totalWidth = Math.min(window.innerWidth - 30, window.innerWidth * 0.98);

// 网格尺寸：用 gapH 计算宽度，用 gapV 计算高度
const gridWidth = TARGET_PLOT_SIZE * 3 + gapH * 2;
const gridHeight = TARGET_PLOT_SIZE * 2 + gapV;    // 只有 1 个行间隙

// 画布高度自适应
const totalHeight = Math.max(window.innerHeight * 0.9, margin.top + margin.bottom + gridHeight);
const decayTotalHeight = totalHeight;

// 水平居中偏移（基于 gapH 计算的网格宽度）
const offsetX = (totalWidth - gridWidth) / 2;
const offsetY = margin.top;

const plotSize = TARGET_PLOT_SIZE;

// 样式配置
const STYLE = {
  pointR: 3,
  pointRHover: 6,
  lineW: 2,
  colorIm: "steelblue",
  colorPa: "red",
  colorDecay: "red",
  colorStandard: "#ff7f0e",
  fontAxis: "12px",
  fontTitle: "20px",
  titleColor: "#6f00ff"
}

// ======================
// 2. 工具函数
// ======================
//辅助函数：计算实验1和实验3的单个被试平均值 + 全局平均值
function getAverageImPa(data) {
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

// ======================
// 3. 主程序：绘图
// ======================
//解析csv，字符串转数字
d3.csv("real_data.csv").then(data => {
    // 字符串转数字
    data.forEach(d => {
        d.input = safeNum(d.input);
        d.output = safeNum(d.output);
        d.delay = safeNum(d.delay);
    });

    //实验1、实验3的数据和实验4的数据分开
    const raw_data_im = d3.filter(data, (item) => item.delay == 65537);
    const raw_data_pa = d3.filter(data, (item) => item.delay == 0);
    const raw_data_de = d3.filter(data, (item) => item.delay != 65537 && item.input == 9);
    //得到每个被试的平均值和所有人的平均值数据集
    const data_im = getAverageImPa(raw_data_im);
    const data_pa = getAverageImPa(raw_data_pa);
    const data_de = getAverageDe(raw_data_de);


    //这里是全部报告法与部分报告法的画布
    const svg1 = d3.select("#immediateandpartial")
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight);
    const svg2 = d3.select("#decay")
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', decayTotalHeight)
        .style("border", "1px solid #000"); // 新增

    //画单个全部&部分报告法图表的函数
    function drawEachImPa(container, name, data, x, y){
        const im_data = d3.group(data, d => d.delay).get(65537);
        const pa_data = d3.group(data, d => d.delay).get(0);
        //为了画折线需要排序
        im_data.sort((a, b) => a.input - b.input);
        pa_data.sort((a, b) => a.input - b.input);


        const g = container.append('g')
            .attr('transform', `translate(${x}, ${y})`);
    
        //x轴y轴
        const xScale = d3.scaleLinear()
            .domain([0, 12])
            .range([0, plotSize])
        const yScale = d3.scaleLinear()
            .domain([0, 12])
            .range([plotSize, 0]);

        //按照论文，添加了y=x的标准线
        const standardLine = d3.line()
            .x(d => xScale(d))
            .y(d => yScale(d));
        const standardPoints = [0, 12];
        g.append('path')
            .attr('d', standardLine(standardPoints))
            .attr('fill', 'none')
            .attr('stroke', STYLE.colorStandard)
            .attr('stroke-width', STYLE.lineW)
            .attr('stroke-dasharray', '4 2');

        //全部报告法实验数据的线
        const im_line = d3.line()
            .x(d => xScale(d.input))
            .y(d => yScale(d.output))
            .defined(d => !isNaN(d.output));
        g.append('path')
            .attr('d', im_line(im_data))
            .attr('fill', 'none')
            .attr('stroke', STYLE.colorIm)
            .attr('stroke-width', STYLE.lineW);
        //实验数据的点
        g.selectAll('.circle-im')
            .data(im_data)
            .enter()
            .append('circle')
            .attr('class', 'circle-im')
            .attr('cx', d => xScale(d.input))
            .attr('cy', d => yScale(d.output))
            .attr('r', STYLE.pointR)
            .attr('fill', STYLE.colorIm)
            .on('mouseover', function(e, d) {
                d3.select(this).attr('r', STYLE.pointRHover);
                g.append('text')
                    .attr('class', 'tip')
                    .attr('text-anchor', 'middle')
                    .attr('x', xScale(d.input))
                    .attr('y', yScale(d.output) + 15)
                    .text(`input: ${d.input}, output: ${d.output.toFixed(2)}`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', STYLE.pointR);
                d3.selectAll('.tip').remove();
            });

        //部分报告法实验数据的线
        const pa_line = d3.line()
            .x(d => xScale(d.input))
            .y(d => yScale(d.output))
            .defined(d => !isNaN(d.output));
        g.append('path')
            .attr('d', pa_line(pa_data))
            .attr('fill', 'none')
            .attr('stroke', STYLE.colorPa)
            .attr('stroke-width', STYLE.lineW);
        //实验数据的点
        g.selectAll('.circle-pa')
            .data(pa_data)
            .enter()
            .append('circle')
            .attr('class', 'circle-pa')
            .attr('cx', d => xScale(d.input))
            .attr('cy', d => yScale(d.output))
            .attr('r', STYLE.pointR)
            .attr('fill', STYLE.colorPa)
            .on('mouseover', function(e, d) {
                d3.select(this).attr('r', STYLE.pointRHover);
                g.append('text')
                    .attr('class', 'tip')
                    .attr('text-anchor', 'middle')
                    .attr('x', xScale(d.input))
                    .attr('y', yScale(d.output) + 15)
                    .text(`input: ${d.input}, output: ${d.output.toFixed(2)}`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', STYLE.pointR);
                d3.selectAll('.tip').remove();
            });
        
        //我们实验只会出现这几个值
        const xTickValues = [6, 8, 9, 12];
        g.append('g')
            .attr('transform', `translate(0, ${plotSize})`)
            .call(d3.axisBottom(xScale).tickValues(xTickValues))
            .style('font-size', STYLE.fontAxis);
        g.append('g')
            .call(d3.axisLeft(yScale).ticks(6))
            .style('font-size', STYLE.fontAxis);

        //图例区（Ss的名字）
        g.append('text')
            .attr('x', plotSize - 150)
            .attr('y', 40)
            .attr('text-anchor', 'end')
            .style('font-size', STYLE.fontTitle)
            .style('fill', STYLE.titleColor)
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
            .range([0, plotSize])
        const yScaleLeft = d3.scaleLinear()
            .domain([0, 9])
            .range([plotSize, 0])
        const yScaleRight = d3.scaleLinear()
            .domain([0, 100])
            .range([plotSize, 0])

        //按照论文，添加了x=0的标准线
        g.append('line')
            .attr('x1', xScale(0)).attr('x2', xScale(0))
            .attr('y1', yScaleLeft(0)).attr('y2', yScaleLeft(9))
            .attr('stroke',STYLE.colorStandard)
            .attr('stroke-width',STYLE.lineW)
            .attr('stroke-dasharray','4 2');

        //实验数据的线
        const line = d3.line()
            .x(d => xScale(d.delay))
            .y(d => yScaleLeft(d.output))
            .defined(d => !isNaN(d.output));
        g.append('path')
            .attr('d', line(de_data))
            .attr('fill', 'none')
            .attr('stroke', STYLE.colorDecay)
            .attr('stroke-width', STYLE.lineW);
        //实验数据的点
        g.selectAll('.circle')
            .data(de_data)
            .enter()
            .append('circle')
            .attr('class', 'circle')
            .attr('cx', d => xScale(d.delay))
            .attr('cy', d => yScaleLeft(d.output))
            .attr('r', STYLE.pointR)
            .attr('fill', STYLE.colorDecay)
            .on('mouseover', function(e, d) {
                d3.select(this).attr('r', STYLE.pointRHover);
                g.append('text')
                    .attr('class', 'tip')
                    .attr('text-anchor', 'middle')
                    .attr('x', xScale(d.delay))
                    .attr('y', yScaleLeft(d.output) + 15)
                    .text(`delay: ${d.delay}, output: ${d.output.toFixed(2)}`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', STYLE.pointR);
                d3.selectAll('.tip').remove();
            });
        
        //补充各个轴的特征并实例化
        const xTickValues = [-0.1, 0, 0.15, 0.3, 0.5, 1.0];
        const yTickValuesLeft = [2, 4, 6, 8, 9];
        const yTickValuesRight = [0, 25, 50, 75, 100];
        g.append('g')
            .attr('transform', `translate(0, ${plotSize})`)
            .call(d3.axisBottom(xScale).tickValues(xTickValues))
            .style('font-size', STYLE.fontAxis);
        g.append('g')
            .call(d3.axisLeft(yScaleLeft).tickValues(yTickValuesLeft))
            .style('font-size', STYLE.fontAxis);
        g.append('g')
            .attr('transform', `translate(${plotSize}, 0)`) 
            .call(d3.axisRight(yScaleRight).tickValues(yTickValuesRight))
            .style('font-size', STYLE.fontAxis);

        //添加左右柱子（右代表全部报告法在3x3下能报告出的平均值）
        g.append('rect')
            .attr('x', xScale(-0.05))
            .attr('width', xScale(0) - xScale(-0.05))
            .attr('y', yScaleLeft(1))
            .attr('height', plotSize - yScaleLeft(1))
            .attr('fill', '#000')
        const imValue = (im_data.length > 0 && !isNaN(im_data[0].output)) ? im_data[0].output : 0;
        const imValuePercentage = (imValue / 9) * 100
        g.append('rect')
            .attr('x', xScale(1.18))
            .attr('width', xScale(1.23) - xScale(1.18))
            .attr('y', yScaleLeft(imValue))
            .attr('height', plotSize - yScaleLeft(imValue))
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
            .attr('x', plotSize - 150)
            .attr('y', 40)
            .attr('text-anchor', 'end')
            .style('font-size', STYLE.fontTitle)
            .style('fill', STYLE.titleColor)
            .text(name);
    }

        //实验1，3的绘图部分
    const mergedData = [...data_im, ...data_pa];
    const grouped_data = d3.group(mergedData, d => d.name);

    // 左侧 Average 图（跨两行垂直居中）
    drawEachImPa(svg1, 'Average', grouped_data.get('average'),
      offsetX + 0 * (plotSize + gapH),
      offsetY + (gridHeight - plotSize) / 2
    );

    // 右侧第一行
    drawEachImPa(svg1, 'C', grouped_data.get('C'),
      offsetX + 1 * (plotSize + gapH), offsetY);
    drawEachImPa(svg1, 'L', grouped_data.get('L'),
      offsetX + 2 * (plotSize + gapH), offsetY);

    // 右侧第二行（垂直偏移 = 上一行高度 + 垂直间距）
    drawEachImPa(svg1, 'W', grouped_data.get('W'),
      offsetX + 1 * (plotSize + gapH), offsetY + plotSize + gapV);
    //drawEachImPa(svg1, 'Z', grouped_data.get('Z'),
      //offsetX + 2 * (plotSize + gapH), offsetY + plotSize + gapV);

    // ======================
    // 实验4衰变图：完全一样的全屏排版
    // ======================
    const grouped_de = d3.group(data_de, d => d.name);
    const grouped_im = d3.group(data_im, d => d.name);

    // Average 图（左侧垂直居中）
    drawEachDecay(svg2, 'Average', grouped_de.get('average'), grouped_im.get('average'),
      offsetX + 0 * (plotSize + gapH),
      offsetY + (gridHeight - plotSize) / 2
    );

    // 右侧第一行
    drawEachDecay(svg2, 'C', grouped_de.get('C'), grouped_im.get('C'),
      offsetX + 1 * (plotSize + gapH), offsetY);
    drawEachDecay(svg2, 'L', grouped_de.get('L'), grouped_im.get('L'),
      offsetX + 2 * (plotSize + gapH), offsetY);

    // 右侧第二行
    drawEachDecay(svg2, 'W', grouped_de.get('W'), grouped_im.get('W'),
      offsetX + 1 * (plotSize + gapH), offsetY + plotSize + gapV);
    drawEachDecay(svg2, 'Z', grouped_de.get('Z'), grouped_im.get('Z'),
      offsetX + 2 * (plotSize + gapH), offsetY + plotSize + gapV);
});