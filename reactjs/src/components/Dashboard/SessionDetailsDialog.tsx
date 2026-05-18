/**
 * SessionDetailsDialog Component
 * Modal dialog showing detailed information about a selected route session
 * Displays session metadata, route details, and navigation information
 */

import React from 'react';
import { Dialog } from 'primereact/dialog';
import { RouteSession } from './types';
import { formatDuration } from './mapUtils';
import './styles/SessionDetailsDialog.css';

interface SessionDetailsDialogProps {
  // Dialog visibility and control
  visible: boolean;
  onHide: () => void;

  // Session data to display
  session: RouteSession | null;

  // Loading state
  isLoading: boolean;
}

const SessionDetailsDialog: React.FC<SessionDetailsDialogProps> = ({
  visible,
  onHide,
  session,
  isLoading,
}) => {
  return (
    <Dialog
      header="Session Insights"
      visible={visible}
      onHide={onHide}
      style={{ width: '34rem' }}
      modal
    >
      {/* Content area - show session details or loading message */}
      {isLoading ? (
        <p>Loading session details...</p>
      ) : session ? (
        <div className="session-details-content">
          {/* Session name and identifier */}
          <div className="detail-row">
            <span className="detail-label">Session Name</span>
            <span className="detail-value">{session.sessionName}</span>
          </div>

          {/* Current status */}
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">{session.status}</span>
          </div>

          {/* Start location */}
          <div className="detail-row">
            <span className="detail-label">Start Location</span>
            <span className="detail-value">
              {session.startAddress ?? `${session.startLat}, ${session.startLng}`}
            </span>
          </div>

          {/* Destination location */}
          <div className="detail-row">
            <span className="detail-label">Destination</span>
            <span className="detail-value">
              {session.destinationAddress ?? `${session.endLat}, ${session.endLng}`}
            </span>
          </div>

          {/* Distance remaining to destination */}
          <div className="detail-row">
            <span className="detail-label">Remaining Distance</span>
            <span className="detail-value">
              {session.remainingDistance
                ? `${session.remainingDistance} m`
                : '-'}
            </span>
          </div>

          {/* Estimated time to destination */}
          <div className="detail-row">
            <span className="detail-label">ETA</span>
            <span className="detail-value">
              {formatDuration(session.estimatedTimeToDestinationSeconds)}
            </span>
          </div>

          {/* Total journey distance */}
          <div className="detail-row">
            <span className="detail-label">Total Distance</span>
            <span className="detail-value">
              {session.totalDistance ? `${session.totalDistance} m` : '-'}
            </span>
          </div>
        </div>
      ) : (
        <p>No session data available.</p>
      )}
    </Dialog>
  );
};

export default SessionDetailsDialog;
