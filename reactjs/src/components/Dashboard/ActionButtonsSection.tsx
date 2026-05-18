/**
 * ActionButtonsSection Component
 * Primary action buttons for route planning and tracking
 * Features:
 * - Plan Route: Create a new route with start/end locations
 * - Start/Stop Tracking: Toggle automatic location tracking
 * - Send Now: Manually send current location update
 * - Cancel: Stop the active route session
 * 
 * NOTE: Pause and Resume functionality removed as per request
 */

import React from 'react';
import { Button } from 'primereact/button';
import './styles/ActionButtonsSection.css';

interface ActionButtonsSectionProps {
  // Route planning
  onPlanRoute: () => void;
  canPlanRoute: boolean;

  // Tracking control
  trackingEnabled: boolean;
  onToggleTracking: () => void;
  canTrack: boolean;

  // Manual location update
  onSendLocationNow: () => void;
  canSendLocation: boolean;

  // Cancel session
  onCancelSession: () => void;
  canCancelSession: boolean;
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  onPlanRoute,
  canPlanRoute,
  trackingEnabled,
  onToggleTracking,
  canTrack,
  onSendLocationNow,
  canSendLocation,
  onCancelSession,
  canCancelSession,
}) => {
  return (
    <div className="action-buttons">
      {/* Plan a new route with start and end locations */}
      <Button
        label="Plan Route"
        icon="pi pi-directions"
        onClick={onPlanRoute}
        disabled={!canPlanRoute}
        className="btn-primary"
        tooltip="Plan route with current start and destination"
      />

      {/* Toggle automatic location tracking */}
      <Button
        label={trackingEnabled ? 'Tracking ON' : 'Start Tracking'}
        icon={trackingEnabled ? 'pi pi-spin pi-sync' : 'pi pi-play'}
        onClick={onToggleTracking}
        disabled={!canTrack}
        className="btn-primary"
        tooltip={
          trackingEnabled
            ? 'Stop automatic location tracking'
            : 'Start automatic location tracking'
        }
      />

      {/* Manually send current location to backend */}
      <Button
        label="Send Now"
        icon="pi pi-send"
        onClick={onSendLocationNow}
        disabled={!canSendLocation}
        className="btn-secondary"
        tooltip="Manually send current location update to backend"
      />

      {/* Cancel the active session */}
      <Button
        label="Cancel"
        icon="pi pi-times"
        onClick={onCancelSession}
        disabled={!canCancelSession}
        className="btn-danger"
        tooltip="Cancel and stop the current route session"
      />
    </div>
  );
};

export default ActionButtonsSection;
