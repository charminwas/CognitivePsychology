// 等待页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 1. 设置图表尺寸和边距
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // 2. 创建SVG容器
  const svg = d3.select("#chart-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // 3. 加载数据（从data.json文件读取）
  d3.json("data.json").then(function(data) {
    // 4. 创建比例尺
    // X轴比例尺（分类数据）
    const x = d3.scaleBand()
      .domain(data.map(d => d.name)) // 绑定X轴数据（星期名称）
      .range([0, width])             // X轴像素范围
      .padding(0.1);                 // 条形之间的间距

    // Y轴比例尺（数值数据）
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)]) // Y轴数值范围（0到最大值）
      .range([height, 0]);                     // Y轴像素范围（从上到下）

    // 5. 绘制X轴
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x)); // 底部X轴

    // 6. 绘制Y轴
    svg.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y)); // 左侧Y轴

    // 7. 绘制条形
    svg.selectAll(".bar")
      .data(data) // 绑定数据
      .enter()    // 为每个数据点创建元素
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.name))    // 条形X坐标
      .attr("y", d => y(d.value))   // 条形Y坐标
      .attr("width", x.bandwidth()) // 条形宽度
      .attr("height", d => height - y(d.value)); // 条形高度
  }).catch(function(error) {
    // 捕获加载数据的错误
    console.error("加载数据失败:", error);
  });
});