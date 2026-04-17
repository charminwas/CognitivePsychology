//常量区
const margin = { top: 20, right: 100, bottom: 30, left: 40 };
const plotWidth = 300;
const plotHeight = 300;
const gap = 50;
const totalWidth = plotWidth * 2 + gap + margin.left + margin.right;
const totalHeight = plotHeight * 2 + gap + margin.top + margin.bottom;
// 衰变图：独立高度（2x2网格，不与其他图重叠）
const decayTotalHeight = totalHeight; 

function setStatus(text) {
    const el = document.getElementById("status-text");
    if (el) el.textContent = text;
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function discoverCsvFiles() {
    // 依赖“本地服务器”提供的目录列表（例如 python -m http.server）。
    // 直接双击打开 html（file://）时通常无法列目录/读csv。
    const res = await fetch("./", { cache: "no-store" });
    if (!res.ok) throw new Error(`无法读取目录列表：HTTP ${res.status}`);
    const html = await res.text();

    // 解析目录列表中的所有链接（兼容 python http.server 的输出）
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("a"))
        .map(a => a.getAttribute("href"))
        .filter(Boolean)
        .map(href => href.split("?")[0].split("#")[0]);

    const csvs = links
        .map(href => href.startsWith("./") ? href.slice(2) : href)
        .filter(href => href && href !== "../")
        .filter(href => href.toLowerCase().endsWith(".csv"))
        .filter(href => !href.endsWith("/"))
        .filter(href => !href.startsWith("/"))
        .filter(href => !href.includes("/")) // 同级目录文件
        .map(href => decodeURIComponent(href));

    // 优先使用 COMPLETE 文件；如果没有 COMPLETE，则退回使用全部 csv
    const complete = csvs.filter(f => f.includes("_COMPLETE_"));
    return (complete.length > 0 ? complete : csvs).sort((a, b) => a.localeCompare(b));
}

async function loadAllCsvData(files) {
    // d3.csv 单次失败会 throw；这里做逐个容错并汇总报错
    const allRows = [];
    const errors = [];

    for (const file of files) {
        try {
            const rows = await d3.csv(file);
            rows.forEach(d => {
                d.input = +d.input;
                d.output = +d.output;
                d.delay = +d.delay;
                d.__file = file;
            });
            allRows.push(...rows);
        } catch (e) {
            errors.push({ file, error: e });
        }
    }

    return { rows: allRows, errors };
}

async function loadCsvFromFileList(fileList) {
    const allRows = [];
    const errors = [];

    for (const file of Array.from(fileList || [])) {
        try {
            const text = await file.text();
            const rows = d3.csvParse(text);
            rows.forEach(d => {
                d.input = +d.input;
                d.output = +d.output;
                d.delay = +d.delay;
                d.__file = file.name;
            });
            allRows.push(...rows);
        } catch (e) {
            errors.push({ file: file?.name || "unknown", error: e });
        }
    }

    return { rows: allRows, errors };
}

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

function drawEachImPa(container, name, data, x, y){
    const im_data = d3.group(data, d => d.delay).get(65537) || [];
    const pa_data = d3.group(data, d => d.delay).get(0) || [];
    if (im_data.length === 0 && pa_data.length === 0) {
        console.warn(`Immediate/Partial 图【${name}】无数据`);
        return;
    }

    //为了画折线需要排序
    im_data.sort((a, b) => a.input - b.input);
    pa_data.sort((a, b) => a.input - b.input);

    const g = container.append('g')
        .attr('transform', `translate(${x}, ${y})`);

    //x轴y轴
    const xScale = d3.scaleLinear()
        .domain([0, 12])
        .range([0, plotWidth]);
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
    if (im_data.length > 0) {
        const im_line = d3.line()
            .x(d => xScale(d.input))
            .y(d => yScale(d.output));
        g.append('path')
            .attr('d', im_line(im_data))
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2);

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
            .on('mouseover', function(e, d) {
                d3.select(this).attr('r', 6);
                g.append('text')
                    .attr('class', 'tip')
                    .attr('text-anchor', 'middle')
                    .attr('x', xScale(d.input))
                    .attr('y', yScale(d.output) + 15)
                    .text(`input: ${d.input}, output: ${d.output.toFixed(2)}`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 3);
                d3.selectAll('.tip').remove();
            });
    }

    //部分报告法实验数据的线
    if (pa_data.length > 0) {
        const pa_line = d3.line()
            .x(d => xScale(d.input))
            .y(d => yScale(d.output));
        g.append('path')
            .attr('d', pa_line(pa_data))
            .attr('fill', 'none')
            .attr('stroke', 'red')
            .attr('stroke-width', 2);

        g.selectAll('.circle-pa')
            .data(pa_data)
            .enter()
            .append('circle')
            .attr('class', 'circle-pa')
            .attr('cx', d => xScale(d.input))
            .attr('cy', d => yScale(d.output))
            .attr('r', 3)
            .attr('fill', 'red')
            .on('mouseover', function(e, d) {
                d3.select(this).attr('r', 6);
                g.append('text')
                    .attr('class', 'tip')
                    .attr('text-anchor', 'middle')
                    .attr('x', xScale(d.input))
                    .attr('y', yScale(d.output) + 15)
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

function DrawEachDecay(container, name, de_data, im_data, x, y){
    if (!de_data || de_data.length === 0) {
        console.warn(`衰变图【${name}】无数据`);
        return;
    }
    //只要3x3矩阵的
    im_data = im_data?.filter(item => item.input == 9) || [];
    de_data = [...de_data].sort((a,b)=>a.delay - b.delay);
    const g = container.append('g')
        .attr('transform', `translate(${x}, ${y})`);

    //x轴y轴 论文里图有两条y轴，左边是正确数目右边是正确率
    const xScale = d3.scaleLinear()
        .domain([-0.15, 1.25])//稍微大一点留点空隙
        .range([0, plotWidth]);
    const yScaleLeft = d3.scaleLinear()
        .domain([0, 9])
        .range([plotHeight, 0]);
    const yScaleRight = d3.scaleLinear()
        .domain([0, 100])
        .range([plotHeight, 0]);

    //按照论文，添加了x=0的标准线
    g.append('line')
        .attr('x1', xScale(0)).attr('x2', xScale(0))
        .attr('y1', yScaleLeft(0)).attr('y2', yScaleLeft(9))
        .attr('stroke','#ff7f0e').attr('stroke-width',2).attr('stroke-dasharray','4 2');

    //实验数据的线
    const line = d3.line()
        .x(d => xScale(d.delay))
        .y(d => yScaleLeft(d.output));
    g.append('path')
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
        .on('mouseover', function(e, d) {
            d3.select(this).attr('r', 6);
            g.append('text')
                .attr('class', 'tip')
                .attr('text-anchor', 'middle')
                .attr('x', xScale(d.delay))
                .attr('y', yScaleLeft(d.output) + 15)
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
        .attr('fill', '#000');

    const imValue = im_data.length > 0 ? im_data[0].output : 0;
    const imValuePercentage = (imValue / 9) * 100;
    g.append('rect')
        .attr('x', xScale(1.18))
        .attr('width', xScale(1.23) - xScale(1.18))
        .attr('y', yScaleLeft(imValue))
        .attr('height', plotHeight - yScaleLeft(imValue))
        .attr('fill', '#000')
        .on('mouseover', function(){
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
                .text(`Immediate-Memory正确率: ${imValuePercentage.toFixed(2)}%`);
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

function renderAllSubjects({ data_im, data_pa, data_de }) {
    const subjectsRoot = document.getElementById("subjects");
    if (!subjectsRoot) return;
    subjectsRoot.innerHTML = "";

    // 只对“真实被试名”画图；另外额外画一个 Average
    const subjectNames = Array.from(
        new Set(
            [...data_im, ...data_pa, ...data_de]
                .map(d => d.name)
                .filter(n => n && n !== "average")
        )
    ).sort((a, b) => String(a).localeCompare(String(b)));

    const allNames = ["average", ...subjectNames];

    const grouped_impa = d3.group([...data_im, ...data_pa], d => d.name);
    const grouped_de = d3.group(data_de, d => d.name);
    const grouped_im = d3.group(data_im, d => d.name);

    for (const name of allNames) {
        const card = document.createElement("div");
        card.className = "subject";
        card.innerHTML = `
            <div class="subject-title">${name === "average" ? "Average（全体平均）" : `被试：${escapeHtml(name)}`}</div>
            <div class="charts">
                <div class="chart-card">
                    <div class="chart-title">Immediate vs Partial</div>
                    <div id="impa-${escapeHtml(name)}"></div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Decay（input=9）</div>
                    <div id="decay-${escapeHtml(name)}"></div>
                </div>
            </div>
        `;
        subjectsRoot.appendChild(card);

        const impaDiv = card.querySelector(`#impa-${CSS.escape(name)}`);
        const decayDiv = card.querySelector(`#decay-${CSS.escape(name)}`);

        // immediate/partial
        const impaData = grouped_impa.get(name) || [];
        if (impaDiv && impaData.length > 0) {
            const svg = d3.select(impaDiv)
                .append("svg")
                .attr("width", margin.left + plotWidth + margin.right)
                .attr("height", margin.top + plotHeight + margin.bottom);
            drawEachImPa(svg, name === "average" ? "Average" : name, impaData, margin.left, margin.top);
        } else if (impaDiv) {
            impaDiv.textContent = "无 Immediate/Partial 数据";
        }

        // decay
        const deData = grouped_de.get(name) || [];
        const imDataForBar = grouped_im.get(name) || [];
        if (decayDiv && deData.length > 0) {
            const svg = d3.select(decayDiv)
                .append("svg")
                .attr("width", margin.left + plotWidth + margin.right)
                .attr("height", margin.top + plotHeight + margin.bottom);
            DrawEachDecay(svg, name === "average" ? "Average" : name, deData, imDataForBar, margin.left, margin.top);
        } else if (decayDiv) {
            decayDiv.textContent = "无 Decay 数据（需要 delay != 65537 且 input==9）";
        }
    }
}

(async function main() {
    try {
        // 备用：手动选择 CSV
        const pickerBtn = document.getElementById("csv-picker-btn");
        const picker = document.getElementById("csv-picker");
        if (pickerBtn && picker) {
            pickerBtn.addEventListener("click", () => picker.click());
            picker.addEventListener("change", async () => {
                const files = picker.files;
                if (!files || files.length === 0) return;
                setStatus(`正在读取本地选择的 ${files.length} 个 CSV……`);
                const { rows, errors } = await loadCsvFromFileList(files);
                if (errors.length > 0) console.warn("部分本地 CSV 读取失败：", errors);
                if (rows.length === 0) {
                    setStatus("本地 CSV 读取失败或无数据行（失败原因见控制台）。");
                    return;
                }

                setStatus(`已从本地读取 ${rows.length} 行数据（${files.length} 个文件）。`);
                const raw_data_im = d3.filter(rows, (item) => item.delay == 65537);
                const raw_data_pa = d3.filter(rows, (item) => item.delay == 0);
                const raw_data_de = d3.filter(rows, (item) => item.delay != 65537 && item.input == 9);
                const data_im = raw_data_im.length > 0 ? getAverageImPa(raw_data_im) : [];
                const data_pa = raw_data_pa.length > 0 ? getAverageImPa(raw_data_pa) : [];
                const data_de = raw_data_de.length > 0 ? getAverageDe(raw_data_de) : [];
                renderAllSubjects({ data_im, data_pa, data_de });
            });
        }

        setStatus("正在发现同级目录下的 CSV 文件……（请确保用本地服务器打开此页面）");
        const files = await discoverCsvFiles();
        if (!files || files.length === 0) {
            setStatus("未从目录列表发现任何 CSV（可能是目录列表解析失败）。你可以点击“手动选择 CSV（备用）”。");
            return;
        }

        setStatus(`发现 ${files.length} 个 CSV，正在加载：${files.join(", ")}`);
        const { rows, errors } = await loadAllCsvData(files);
        if (rows.length === 0) {
            const errText = errors.length > 0 ? `加载失败：${errors.map(e => e.file).join(", ")}` : "未读到任何数据行";
            setStatus(errText);
            return;
        }

        if (errors.length > 0) {
            console.warn("部分 CSV 加载失败：", errors);
            setStatus(`已加载 ${rows.length} 行数据（${files.length - errors.length}/${files.length} 个文件成功）。失败文件见控制台。`);
        } else {
            setStatus(`已加载 ${rows.length} 行数据（${files.length} 个文件）。`);
        }

        //实验1、实验3的数据和实验4的数据分开（按你的 delay 编码约定）
        const raw_data_im = d3.filter(rows, (item) => item.delay == 65537);
        const raw_data_pa = d3.filter(rows, (item) => item.delay == 0);
        const raw_data_de = d3.filter(rows, (item) => item.delay != 65537 && item.input == 9);

        //得到每个被试的平均值和所有人的平均值数据集
        const data_im = raw_data_im.length > 0 ? getAverageImPa(raw_data_im) : [];
        const data_pa = raw_data_pa.length > 0 ? getAverageImPa(raw_data_pa) : [];
        const data_de = raw_data_de.length > 0 ? getAverageDe(raw_data_de) : [];

        renderAllSubjects({ data_im, data_pa, data_de });
    } catch (e) {
        console.error(e);
        setStatus(`初始化失败：${e?.message || e}`);
    }
})();