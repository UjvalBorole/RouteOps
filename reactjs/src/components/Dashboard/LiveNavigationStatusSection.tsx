/**
 * LiveNavigationStatusSection Component
 * Displays real-time navigation details for the active session
 * Shows current position, speed, ETA, and progress
 */

import React from 'react';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { RouteSession } from './types';
import { formatDuration } from './mapUtils';
import './styles/LiveNavigationStatusSection.css';

interface LiveNavigationStatusSectionProps {
  // Active session data
  activeSession: RouteSession;

  // Tracking state
  trackingEnabled: boolean;
}

const LiveNavigationStatusSection: React.FC<LiveNavigationStatusSectionProps> = ({
  activeSession,
  trackingEnabled,
}) => {
  return (
    <Card className="orders-card route-card-glow">
      {/* Card header with tracking status */}
      <div className="card-header">
        <h2 className="card-title">Live Navigation Status</h2>
        <Tag
          value={trackingEnabled ? 'AUTO TRACKING' : 'MANUAL MODE'}
          severity={trackingEnabled ? 'success' : 'warning'}
        />
      </div>
      <Divider />

      {/* Session details section */}
      <div className="status-content">
        {/* Session identifier */}
        <div className="detail-row">
          <span className="detail-label">Session</span>
          <span className="detail-value">
            {activeSession.sessionName} ({activeSession.sessionId})
          </span>
        </div>

        {/* Current session status */}
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-value">{activeSession.status ?? '-'}</span>
        </div>

        {/* Navigation instruction */}
        <div className="detail-row">
          <span className="detail-label">Next Instruction</span>
          <span className="detail-value">
            {activeSession.nextInstruction ?? 'Move towards route path'}
          </span>
        </div>

        {/* Current GPS coordinates */}
        <div className="detail-row">
          <span className="detail-label">Current Position</span>
          <span className="detail-value">
            {activeSession.currentLat ?? '-'}, {activeSession.currentLng ?? '-'}
          </span>
        </div>

        {/* Current speed in km/h */}
        <div className="detail-row">
          <span className="detail-label">Current Speed</span>
          <span className="detail-value">
            {activeSession.currentSpeedKmh !== undefined
              ? `${activeSession.currentSpeedKmh.toFixed(2)} km/h`
              : '-'}
          </span>
        </div>

        {/* Last segment traveled (distance and time) */}
        <div className="detail-row">
          <span className="detail-label">Last Segment</span>
          <span className="detail-value">
            {activeSession.lastSegmentDistanceMeters !== undefined
              ? `${activeSession.lastSegmentDistanceMeters.toFixed(1)} m in ${formatDuration(
                  activeSession.lastSegmentDurationSeconds
                )}`
              : '-'}
          </span>
        </div>

        {/* Estimated time to reach destination */}
        <div className="detail-row">
          <span className="detail-label">ETA to Destination</span>
          <span className="detail-value">
            {formatDuration(activeSession.estimatedTimeToDestinationSeconds)}
          </span>
        </div>

        {/* Whether user is on the planned route */}
        <div className="detail-row">
          <span className="detail-label">On Route</span>
          <span className="detail-value">
            {String(activeSession.onRoute ?? false)}
          </span>
        </div>

        {/* Progress bar showing completion percentage */}
        <div className="progress-section">
          <label className="detail-label">Journey Progress</label>
          <ProgressBar
            value={activeSession.progressPercentage ?? 0}
            showValue
            style={{ height: '1.5rem' }}
          />
        </div>
      </div>
    </Card>
  );
};

export default LiveNavigationStatusSection;
