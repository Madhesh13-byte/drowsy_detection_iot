import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { FaChartLine, FaChartBar, FaFire, FaCalendarWeek } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Charts = ({ user }) => {
  const [timelineData, setTimelineData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [timeline, weekly, heatmap] = await Promise.all([
        fetch('http://localhost:5000/api/analytics/timeline', { headers }),
        fetch('http://localhost:5000/api/analytics/weekly', { headers }),
        fetch('http://localhost:5000/api/analytics/heatmap', { headers })
      ]);

      setTimelineData(await timeline.json());
      setWeeklyData(await weekly.json());
      setHeatmapData(await heatmap.json());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, []);

  // 24-Hour Timeline Chart
  const timelineChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Drowsy Events',
        data: Array.from({ length: 24 }, (_, hour) => {
          const hourData = timelineData.find(d => d._id.hour === hour);
          return hourData ? hourData.drowsyCount : 0;
        }),
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Normal Events',
        data: Array.from({ length: 24 }, (_, hour) => {
          const hourData = timelineData.find(d => d._id.hour === hour);
          return hourData ? hourData.normalCount : 0;
        }),
        borderColor: '#4BC0C0',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Weekly Trends Chart
  const weeklyChartData = {
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        label: 'Drowsy Events',
        data: Array.from({ length: 7 }, (_, day) => {
          const dayData = weeklyData.find(d => d._id === day + 1);
          return dayData ? dayData.drowsyCount : 0;
        }),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
          '#9966FF', '#FF9F40', '#FF6384'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  // Heatmap simulation (simplified as bar chart)
  const heatmapChartData = {
    labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
    datasets: [
      {
        label: 'Drowsiness Risk %',
        data: [10, 15, 25, 35, 20, 30], // Sample data
        backgroundColor: (ctx) => {
          const value = ctx.parsed.y;
          if (value > 30) return '#FF4444';
          if (value > 20) return '#FF8800';
          return '#44AA44';
        },
        borderColor: '#fff',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="charts-container">
        <div className="loading">Loading charts...</div>
      </div>
    );
  }

  return (
    <div className="charts-container">
      <h2 className="charts-title">Data Visualization</h2>
      
      <div className="charts-grid">
        {/* 24-Hour Timeline */}
        <div className="chart-card">
          <div className="chart-header">
            <FaChartLine className="chart-icon" />
            <h3>24-Hour Drowsiness Timeline</h3>
          </div>
          <div className="chart-wrapper">
            <Line data={timelineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Weekly Trends */}
        <div className="chart-card">
          <div className="chart-header">
            <FaChartBar className="chart-icon" />
            <h3>Weekly Trends</h3>
          </div>
          <div className="chart-wrapper">
            <Bar data={weeklyChartData} options={chartOptions} />
          </div>
        </div>

        {/* Risk Heatmap */}
        <div className="chart-card">
          <div className="chart-header">
            <FaFire className="chart-icon" />
            <h3>Drowsiness Risk by Time</h3>
          </div>
          <div className="chart-wrapper">
            <Bar data={heatmapChartData} options={chartOptions} />
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <FaCalendarWeek className="chart-icon" />
            <h3>This Week vs Last Week</h3>
          </div>
          <div className="chart-wrapper">
            <Line 
              data={{
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                  {
                    label: 'This Week',
                    data: [5, 3, 8, 2, 6, 4, 1],
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true
                  },
                  {
                    label: 'Last Week',
                    data: [8, 6, 12, 4, 9, 7, 3],
                    borderColor: '#FF6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: true
                  }
                ]
              }} 
              options={chartOptions} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts;