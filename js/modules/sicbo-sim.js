(function () {
  'use strict';

  let svg, g, xScale, yScale, width, height, margin, line, area;
  let chartEl;

  function initChart(containerId) {
    chartEl = document.getElementById(containerId);
    if (!chartEl) return;
    chartEl.innerHTML = '';
    margin = { top: 16, right: 16, bottom: 28, left: 52 };
    width = chartEl.clientWidth - margin.left - margin.right;
    height = 260 - margin.top - margin.bottom;

    svg = d3.select('#' + containerId)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    xScale = d3.scaleLinear();
    yScale = d3.scaleLinear();

    line = d3.line()
      .x((d) => xScale(d.round))
      .y((d) => yScale(d.balance));

    area = d3.area()
      .x((d) => xScale(d.round))
      .y0((d) => yScale(Math.min(d.balance, d._baseline || d.balance)))
      .y1((d) => yScale(d.balance));
  }

  function updateChart(history, initial) {
    if (!svg) return;
    const data = history.map((d) => ({ ...d, _baseline: initial }));
    const xMax = d3.max(data, (d) => d.round) || 1;
    const yMin = Math.min(initial, d3.min(data, (d) => d.balance) || 0);
    const yMax = Math.max(initial, d3.max(data, (d) => d.balance) || initial);

    xScale.domain([0, xMax]).range([0, width]);
    yScale.domain([yMin * 0.95, yMax * 1.05]).range([height, 0]);

    g.selectAll('*').remove();

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format('d')))
      .selectAll('text').attr('fill', '#9a958a');
    g.selectAll('.domain, .tick line').attr('stroke', '#2a3544');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .selectAll('text').attr('fill', '#9a958a');

    g.append('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', yScale(initial)).attr('y2', yScale(initial))
      .attr('stroke', '#d4af37').attr('stroke-dasharray', '4,4').attr('opacity', 0.5);

    const segments = [];
    for (let i = 1; i < data.length; i++) {
      segments.push({ from: data[i - 1], to: data[i] });
    }

    segments.forEach((seg) => {
      const color = seg.to.balance >= seg.from.balance ? '#4caf7a' : '#c94a4a';
      g.append('path')
        .datum([seg.from, seg.to])
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', d3.line().x((d) => xScale(d.round)).y((d) => yScale(d.balance)));
    });

    g.selectAll('.dot')
      .data(data.filter((_, i) => i === 0 || i === data.length - 1))
      .enter().append('circle')
      .attr('cx', (d) => xScale(d.round))
      .attr('cy', (d) => yScale(d.balance))
      .attr('r', 4)
      .attr('fill', (d) => d.balance >= initial ? '#4caf7a' : '#c94a4a');
  }

  window.SicBoSim = { initChart, updateChart };
})();
