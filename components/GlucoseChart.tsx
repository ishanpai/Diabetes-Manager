import React, {
  useEffect,
  useState,
} from 'react';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useSettings } from '@/hooks/useSettings';
import { GLUCOSE_TARGET_RANGES } from '@/lib/config';
import { Entry } from '@/types';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';

interface GlucoseChartProps {
  patientId: string;
  entries?: Entry[];
  loading?: boolean;
  error?: string | null;
}

interface ChartDataPoint {
  timestamp: string;
  timestampMs: number;
  glucose: number;
  date: string;
  time: string;
  entryId: string;
}

export function GlucoseChart({ patientId, entries = [], loading = false, error = null }: GlucoseChartProps) {
  const { settings } = useSettings();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [glucoseEntries, setGlucoseEntries] = useState<Entry[]>([]);

  // Filter glucose entries and convert to chart data
  useEffect(() => {
    const glucoseOnly = entries.filter(entry => entry.entryType === 'glucose');
    setGlucoseEntries(glucoseOnly);

    const data: ChartDataPoint[] = glucoseOnly
      .map(entry => {
        const date = new Date(entry.occurredAt);
        let glucoseValue = parseFloat(entry.value);
        
        // Convert mmol/L to mg/dL if needed for consistent display
        if (entry.units === 'mmol/L') {
          glucoseValue = glucoseValue * 18; // Convert to mg/dL for chart
        }
        
        return {
          timestamp: new Date(entry.occurredAt).toISOString(),
          timestampMs: new Date(entry.occurredAt).getTime(),
          glucose: glucoseValue,
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          entryId: entry.id,
        };
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    setChartData(data);
  }, [entries]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const originalValue = data.glucose;
      const displayValue = settings?.glucoseUnits === 'mmol/L' 
        ? (originalValue / 18).toFixed(1) 
        : Math.round(originalValue);
      const d = new Date(data.timestampMs);
      const dateLabel = `${formatDate(d)} at ${formatTime(d)}`;
      return (
        <Box
          sx={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: 1,
            p: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {dateLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Glucose: {displayValue} {settings?.glucoseUnits || 'mg/dL'}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Determine if readings span multiple days and how many
  const uniqueDates = Array.from(new Set(chartData.map(d => d.date)));
  let xAxisMode: 'time' | 'datetime' | 'date' = 'time';
  if (uniqueDates.length > 5) xAxisMode = 'date';
  else if (uniqueDates.length > 1) xAxisMode = 'datetime';

  // Helper for formatting
  function formatDate(d: Date) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function formatTime(d: Date) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  // Calculate Y-axis range based on data
  const glucoseValues = chartData.map(d => d.glucose);
  let yMin = Math.min(...glucoseValues, 70);
  let yMax = Math.max(...glucoseValues, 180);
  if (glucoseValues.length > 0) {
    const range = yMax - yMin;
    const pad = Math.max(10, Math.round(range * 0.1));
    yMin = Math.floor((yMin - pad) / 10) * 10;
    yMax = Math.ceil((yMax + pad) / 10) * 10;
  }
  yMin = Math.max(40, yMin);
  yMax = Math.min(400, yMax);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (glucoseEntries.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Glucose Chart
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No glucose readings available. Add some glucose entries to see the chart.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Glucose Chart
          </Typography>
          <Box display="flex" gap={1}>
            <Chip 
              label={`${glucoseEntries.length} readings`} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              label={settings?.glucoseUnits || 'mg/dL'} 
              size="small" 
              color="secondary" 
              variant="outlined" 
            />
          </Box>
        </Box>

        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              
              {/* Target range reference lines */}
              <ReferenceLine 
                y={GLUCOSE_TARGET_RANGES.veryLow} 
                stroke="#ff4444" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
              <ReferenceLine 
                y={GLUCOSE_TARGET_RANGES.targetMin} 
                stroke="#4caf50" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
              <ReferenceLine 
                y={GLUCOSE_TARGET_RANGES.targetMax} 
                stroke="#4caf50" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
              <ReferenceLine 
                y={GLUCOSE_TARGET_RANGES.veryHigh} 
                stroke="#ff4444" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
              
              <XAxis 
                type="number"
                dataKey="timestampMs" 
                domain={['auto', 'auto']}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={30}
                tickFormatter={(value: number) => {
                  const d = new Date(value);
                  if (xAxisMode === 'date') return formatDate(d);
                  if (xAxisMode === 'datetime') return `${formatDate(d)} ${formatTime(d)}`;
                  return formatTime(d);
                }}
              />
              <YAxis 
                domain={[yMin, yMax]}
                tick={{ fontSize: 12 }}
                label={{ 
                  value: `Glucose (${settings?.glucoseUnits || 'mg/dL'})`, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="glucose" 
                stroke="#2196f3" 
                strokeWidth={2}
                dot={{ fill: '#2196f3', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#2196f3', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* Legend */}
        <Box mt={2} display="flex" flexWrap="wrap" gap={2} justifyContent="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={16} height={2} bgcolor="#ff4444" />
            <Typography variant="caption">Very Low/High</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={16} height={2} bgcolor="#4caf50" />
            <Typography variant="caption">Target Range</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={16} height={2} bgcolor="#2196f3" />
            <Typography variant="caption">Glucose Readings</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
} 