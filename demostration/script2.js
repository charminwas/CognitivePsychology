document.addEventListener('DOMContentLoaded', function(){

    const margin = {top:20, right:20, bottom:20, left:20}
    const width = 400 - margin.left - margin.right
    const height = 300 - margin.top - margin.bottom

    const svg = d3.select('#chart-container')
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    d3.csv('data2.csv').then(data => {
        data.forEach(d => d.score = +d.score)

        const x = d3.scalePoint()
            .domain(data.map(d => d.season_num))
            .range([0, width])
            .padding(0.5)

        const y = d3.scaleLinear()
            .domain([0, 10])
            .range([height, 0])

        svg.append('g').attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))

        svg.append("g").attr("class","axis")
            .call(d3.axisLeft(y))

        const line = d3.line()
        .x(d => x(d.season_num))
        .y(d => y(d.score))
        
        svg.append('path')
            .datum(data)
            .attr('class', 'line')
            .attr('d', line)
    })
})