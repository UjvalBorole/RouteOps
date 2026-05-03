/**
 * SessionsTableSection Component
 * Displays all available route sessions in a data table
 * Allows users to view details and load previous sessions
 */

import React from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { RouteSession } from './types';
import './styles/SessionsTableSection.css';

interface SessionsTableSectionProps {
  // Sessions data
  sessions: RouteSession[];

  // View session details callback
  onViewSessionDetails: (session: RouteSession) => void;
}

const SessionsTableSection: React.FC<SessionsTableSectionProps> = ({
  sessions,
  onViewSessionDetails,
}) => {
  /**
   * Render status badge with color coding
   * Green (success) = ACTIVE/COMPLETED
   * Red (danger) = CANCELLED
   * Yellow (warning) = PAUSED
   * Blue (info) = Others
   */
  const statusTemplate = (rowData: RouteSession) => {
    const statusColors: {
      [key: string]: 'success' | 'warning' | 'danger' | 'info';
    } = {
      ACTIVE: 'success',
      PAUSED: 'warning',
      CANCELLED: 'danger',
      COMPLETED: 'success',
      REACHED: 'success',
    };

    return (
      <Tag
        value={rowData.status ?? 'UNKNOWN'}
        severity={statusColors[rowData.status ?? ''] || 'info'}
      />
    );
  };

  /**
   * Render action button for viewing session details
   */
  const actionTemplate = (rowData: RouteSession) => (
    <Button
      label="View Live"
      icon="pi pi-bolt"
      text
      severity="info"
      onClick={() => onViewSessionDetails(rowData)}
      className="action-button"
      tooltip="Load and view this session's details"
    />
  );

  return (
    <Card className="orders-card route-card-glow">
      {/* Card header with title and session count */}
      <div className="card-header">
        <h2 className="card-title">Route Sessions</h2>
        <Tag value={`${sessions.length} total`} rounded />
      </div>
      <Divider />

      {/* Sessions data table */}
      <div className="orders-table-wrapper">
        <DataTable
          value={sessions}
          paginator
          rows={6}
          responsiveLayout="scroll"
          className="orders-table"
          emptyMessage="No sessions yet. Plan a route to create one."
        >
          {/* Session name column */}
          <Column field="sessionName" header="Name" />

          {/* Status column with color-coded badges */}
          <Column field="status" header="Status" body={statusTemplate} />

          {/* Remaining distance to destination */}
          <Column field="remainingDistance" header="Remaining (m)" />

          {/* Action buttons column */}
          <Column header="Action" body={actionTemplate} style={{ width: '10rem' }} />
        </DataTable>
      </div>
    </Card>
  );
};

export default SessionsTableSection;
