//常量区
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const plotWidth = 250;
const plotHeight = 250;
const gap = 50;
const totalWidth = plotWidth * 2 + gap + margin.left + margin.right;
const totalHeight = plotHeight * 2 + gap + margin.top + margin.bottom;

//辅助函数：计算单个被试平均值 + 全局平均值
function getAverage(data) {
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

//解析csv，字符串转数字
d3.csv("data.csv").then(data => {
    // 字符串转数字
    data.forEach(d => {
        d.input = +d.input;
        d.output = +d.output;
        d.delay = +d.delay;
    });

    //实验1、实验3的数据和实验4的数据分开
    const raw_data_im = d3.filter(data, (item) => {
        return item.delay == 65537
    });
    const raw_data_pa = d3.filter(data, (item) => {
        return item.delay == 0
    });
    const raw_data_de = d3.filter(data, (item) => {
        return item.delay != 65537
    });
    //得到每个被试的平均值和所有人的平均值数据集
    const data_im = getAverage(raw_data_im);
    const data_pa = getAverage(raw_data_pa);
    const data_de = getAverage(raw_data_de);


    //这里是全部报告法与部分报告法的图表区
    const svg = d3.select("#immediateandpartial")
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight);

    //画单个图表的函数
    function drawEachImPa(container, name, data, x, y){
        const im_data = d3.group(data, d => d.delay).get(65537);
        const pa_data = d3.group(data, d => d.delay).get(0);

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
        g.append('path')
            .attr('d', standardLine(standardPoints))
            .attr('fill', 'none')
            .attr('stroke', '#ff7f0e')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4 2');

        //全部报告法实验数据的线
        const im_line = d3.line()
            .x(d => xScale(d.input))
            .y(d => yScale(d.output));
        g.append('path')
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
            .attr('fill', 'steelblue');

        //部分报告法实验数据的线
        const pa_line = d3.line()
            .x(d => xScale(d.input))
            .y(d => yScale(d.output));
        g.append('path')
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
            .attr('fill', 'red');
        
        //我们实验只会出现这几个值
        const xTickValues = [6, 8, 9, 12];
        g.append('g')
            .attr('transform', `translate(0, ${plotHeight})`)
            .call(d3.axisBottom(xScale).tickValues(xTickValues))
            .style('font-size', '12px');
        g.append('g')
            .call(d3.axisLeft(yScale).ticks(6))
            .style('font-size', '12px');

        //图例区，之后需要写上Ss的名字
        g.append('text')
            .attr('x', plotWidth - 150)
            .attr('y', 40)
            .attr('text-anchor', 'end')
            .style('font-size', '20px')
            .style('fill', '#6f00ff')
            .text(name);
    }

    //绘图部分
    const mergedData = [...data_im, ...data_pa];
    const grouped_data = d3.group(mergedData, d => d.name);

    drawEachImPa(svg, 'Average', grouped_data.get('average'), margin.left, margin.top);
    drawEachImPa(svg, 'C', grouped_data.get('C'), margin.left + plotWidth + gap, margin.top);
    drawEachImPa(svg, 'L', grouped_data.get('L'), margin.left, margin.top + plotHeight + gap);
    drawEachImPa(svg, 'W', grouped_data.get('W'), margin.left + plotWidth + gap, margin.top + plotHeight + gap);
});