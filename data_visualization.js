//常量区
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const plotWidth = 250;
const plotHeight = 250;
const gap = 50;
const totalWidth = plotWidth * 2 + gap + margin.left + margin.right;
const totalHeight = plotHeight * 2 + gap + margin.top + margin.bottom;

//这些数据是随机生成用来看效果的，做完实验再改成读取csv
// 第一组
const datasets1 = [
  { input: 3, output: 3 },
  { input: 4, output: 4 },
  { input: 5, output: 5 },
  { input: 6, output: 6 },
  { input: 8, output: 8 },
  { input: 9, output: 9 },
  { input: 10, output: 10 },
  { input: 12, output: 12 },
];
// 第二组
const datasets2 = [
  { input: 3, output: 5 },
  { input: 4, output: 6 },
  { input: 5, output: 7 },
  { input: 6, output: 8 },
  { input: 8, output: 9 },
  { input: 9, output: 10 },
  { input: 10, output: 11 },
  { input: 12, output: 12 },
];
// 第三组
const datasets3 = [
  { input: 3, output: 12 },
  { input: 4, output: 10 },
  { input: 5, output: 8 },
  { input: 6, output: 6 },
  { input: 8, output: 5 },
  { input: 9, output: 4 },
  { input: 10, output: 3 },
  { input: 12, output: 7 },
];
// 第四组
const datasets4 = [
  { input: 3, output: 7 },
  { input: 4, output: 3 },
  { input: 5, output: 12 },
  { input: 6, output: 9 },
  { input: 8, output: 4 },
  { input: 9, output: 11 },
  { input: 10, output: 6 },
  { input: 12, output: 8 },
];

//这里是全部报告法的图表区
const svg = d3.select("#immediate")
    .append('svg')
    .attr('width', totalWidth)
    .attr('height', totalHeight);

//画单个图表的函数
function drawEach(container, data, x, y){
    const g = container.append('g')
        .attr('transform', `translate(${x}, ${y})`);
    //x轴y轴
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.input)])
        .range([0, plotWidth]);
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.output)])
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

    //实验数据的线
    const line = d3.line()
        .x(d => xScale(d.input))
        .y(d => yScale(d.output));
    g.append('path')
        .attr('d', line(data))
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2);
    //实验数据的点
    g.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.input))
        .attr('cy', d => yScale(d.output))
        .attr('r', 3)
        .attr('fill', 'steelblue');
    
    //模仿论文，x轴上只有出现过的字母数量但是线性排列；y轴
    const xTickValues = [...new Set(data.map(item => item.input))].sort(d3.ascending);
    g.append('g')
        .attr('transform', `translate(0, ${plotHeight})`)
        .call(d3.axisBottom(xScale).tickValues(xTickValues))
        .style('font-size', '12px');
    g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .style('font-size', '12px');

    //图例区，之后需要写上Ss的名字
    g.append('text')
        .attr('x', plotWidth - 10)
        .attr('y', 15)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#2E86AB')
        .text('全部报告');
}

drawEach(svg, datasets1, margin.left, margin.top);
drawEach(svg, datasets2, margin.left + plotWidth + gap, margin.top);
drawEach(svg, datasets3, margin.left, margin.top + plotHeight + gap);
drawEach(svg, datasets4, margin.left + plotWidth + gap, margin.top + plotHeight + gap);