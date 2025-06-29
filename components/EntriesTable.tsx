import {
  useEffect,
  useState,
} from 'react';

import { EditEntryDialog } from '@/components/dialogs/EditEntryDialog';
import {
  Entry,
  Medication,
} from '@/types';
import {
  formatDateTime,
  getEntryTypeColor,
} from '@/utils/uiUtils';
import EditIcon from '@mui/icons-material/Edit';
import MedicationIcon from '@mui/icons-material/Medication';
import MonitorIcon from '@mui/icons-material/Monitor';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

interface EntriesTableProps {
  patientId: string;
  patientMedications: Medication[];
  onEntryUpdate: () => void;
}

export function EntriesTable({ patientId, patientMedications, onEntryUpdate }: EntriesTableProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const entriesPerPage = 10;

  const fetchEntries = async (page: number = 0) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/entries?patientId=${patientId}&limit=${entriesPerPage}&offset=${page * entriesPerPage}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch entries');
      }

      if (result.success) {
        setEntries(result.data || []);
        setTotalEntries(result.data?.length || 0);
        setHasMore((result.data?.length || 0) === entriesPerPage);
      } else {
        throw new Error(result.error || 'Failed to fetch entries');
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(currentPage);
  }, [patientId, currentPage]);

  const handleEditEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  const handleEntryUpdate = (updatedEntry: Entry) => {
    // If entry was deleted (value is 'DELETED'), remove it from the list
    if (updatedEntry.value === 'DELETED') {
      setEntries(prev => prev.filter(entry => entry.id !== updatedEntry.id));
      setTotalEntries(prev => prev - 1);
    } else {
      // Update the entry in the list
      setEntries(prev => 
        prev.map(entry => 
          entry.id === updatedEntry.id ? updatedEntry : entry
        )
      );
    }
    
    // Notify parent component to refresh data
    onEntryUpdate();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const totalPages = Math.ceil(totalEntries / entriesPerPage);

  if (loading && entries.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Entries
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Loading entries...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error && entries.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Entries
          </Typography>
          <Typography variant="body2" color="error">
            Error: {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Entries ({totalEntries} total)
          </Typography>
          
          {entries.length > 0 ? (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((entry: Entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Chip 
                            label={entry.entryType} 
                            color={getEntryTypeColor(entry.entryType)}
                            size="small"
                            icon={
                              entry.entryType === 'glucose' ? <MonitorIcon /> :
                              entry.entryType === 'meal' ? <RestaurantIcon /> :
                              entry.entryType === 'insulin' ? <MedicationIcon /> : undefined
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {entry.entryType === 'glucose' && (
                            <Typography variant="body2">
                              {entry.value} {entry.units}
                            </Typography>
                          )}
                          {entry.entryType === 'insulin' && (
                            <Box>
                              <Typography variant="body2">
                                {entry.value} {entry.units}
                              </Typography>
                              {entry.medicationBrand && (
                                <Typography variant="caption" color="text.secondary">
                                  {entry.medicationBrand}
                                </Typography>
                              )}
                            </Box>
                          )}
                          {entry.entryType === 'meal' && (
                            <Typography variant="body2">
                              {entry.value}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(entry.occurredAt)}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditEntry(entry)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={2}>
                  <IconButton
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    size="small"
                  >
                    <NavigateBeforeIcon />
                  </IconButton>
                  
                  <Typography variant="body2">
                    Page {currentPage + 1} of {totalPages}
                  </Typography>
                  
                  <IconButton
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasMore}
                    size="small"
                  >
                    <NavigateNextIcon />
                  </IconButton>
                </Box>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No entries recorded yet
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditEntryDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedEntry(null);
        }}
        entry={selectedEntry}
        patientMedications={patientMedications}
        onSuccess={handleEntryUpdate}
      />
    </>
  );
} 