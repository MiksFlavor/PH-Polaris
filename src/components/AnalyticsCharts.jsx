import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export function AnalyticsCharts({ region }) {
  const discussionRef = useRef(null);
  const partyRef = useRef(null);
  const timelineRef = useRef(null);
  const historicalRef = useRef(null);
  const comparisonRef = useRef(null);
  const chartInstancesRef = useRef([]);

  useEffect(() => {
    if (!region) {
      chartInstancesRef.current.forEach((chart) => chart?.destroy());
      chartInstancesRef.current = [];
      return undefined;
    }

    chartInstancesRef.current.forEach((chart) => chart?.destroy());

    const charts = [
      createDoughnutChart(discussionRef.current, region),
      createBarChart(partyRef.current, region.partyDistribution, 'Party Distribution'),
      createLineChart(timelineRef.current, region.timeline),
      createBarChart(historicalRef.current, [{ label: 'Vote Share', value: region.historicalVoteShare }], 'Historical Vote Share'),
      createComparisonChart(comparisonRef.current, region.comparisonSeries),
    ];

    chartInstancesRef.current = charts;

    return () => {
      charts.forEach((chart) => chart?.destroy());
      chartInstancesRef.current = [];
    };
  }, [region]);

  return (
    <section className="polaris-panel">
      <div className="polaris-panel-title">Charts</div>
      <div className="polaris-chart-grid">
        <ChartFrame title="Discussion Share">
          <canvas ref={discussionRef} />
        </ChartFrame>
        <ChartFrame title="Political Party Distribution">
          <canvas ref={partyRef} />
        </ChartFrame>
        <ChartFrame title="Discussion Timeline">
          <canvas ref={timelineRef} />
        </ChartFrame>
        <ChartFrame title="Historical Election Vote Share">
          <canvas ref={historicalRef} />
        </ChartFrame>
        <ChartFrame title="Discussion vs Election Reference">
          <canvas ref={comparisonRef} />
        </ChartFrame>
      </div>
    </section>
  );
}

function ChartFrame({ title, children }) {
  return (
    <article className="polaris-chart-card">
      <div className="polaris-chart-title">{title}</div>
      <div className="polaris-chart-canvas">{children}</div>
    </article>
  );
}

function createChartBase() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#475569', font: { size: 10 } },
      },
      y: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#475569', font: { size: 10 } },
      },
    },
  };
}

function createDoughnutChart(canvas, region) {
  if (!canvas) {
    return null;
  }

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Current', 'Reference'],
      datasets: [
        {
          data: [region.discussionShare, 100 - region.discussionShare],
          backgroundColor: ['#334155', '#e2e8f0'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
    },
  });
}

function createBarChart(canvas, entries, title) {
  if (!canvas) {
    return null;
  }

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: entries.map((entry) => entry.label),
      datasets: [
        {
          label: title,
          data: entries.map((entry) => entry.value),
          backgroundColor: '#64748b',
          borderWidth: 0,
        },
      ],
    },
    options: createChartBase(),
  });
}

function createLineChart(canvas, entries) {
  if (!canvas) {
    return null;
  }

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: entries.map((entry) => entry.label),
      datasets: [
        {
          label: 'Discussion Timeline',
          data: entries.map((entry) => entry.value),
          borderColor: '#334155',
          backgroundColor: 'rgba(51, 65, 85, 0.08)',
          tension: 0.25,
          fill: true,
          pointRadius: 1,
        },
      ],
    },
    options: createChartBase(),
  });
}

function createComparisonChart(canvas, entries) {
  if (!canvas) {
    return null;
  }

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: entries.map((entry) => entry.label),
      datasets: [
        {
          label: 'Comparison',
          data: entries.map((entry) => entry.value),
          backgroundColor: ['#64748b', '#a16207'],
          borderWidth: 0,
        },
      ],
    },
    options: createChartBase(),
  });
}
