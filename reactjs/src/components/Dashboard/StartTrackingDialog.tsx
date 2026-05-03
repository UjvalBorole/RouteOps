/**
 * StartTrackingDialog Component
 * Confirmation dialog shown after successful route planning
 * Allows user to immediately start location tracking
 */

import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import './styles/StartTrackingDialog.css';

interface StartTrackingDialogProps {
  // Dialog visibility state
  visible: boolean;
  onHide: () => void;

  // Action callbacks
  onStartTracking: () => void;
}

const StartTrackingDialog: React.FC<StartTrackingDialogProps> = ({
  visible,
  onHide,
  onStartTracking,
}) => {
  return (
    <Dialog
      header="Start Live Tracking?"
      visible={visible}
      onHide={onHide}
      style={{ width: '30rem' }}
      modal
    >
      {/* Dialog content */}
      <p>
        Route planned successfully! Start automatic location tracking now?
        <br />
        <small>
          You can also start tracking later using the "Start Tracking" button.
        </small>
      </p>

      {/* Dialog footer with action buttons */}
      <div className="dialog-footer">
        {/* Close without starting tracking */}
        <Button
          label="Later"
          className="btn-secondary"
          onClick={onHide}
          icon="pi pi-times"
        />

        {/* Start tracking immediately */}
        <Button
          label="Start Tracking"
          className="btn-primary"
          onClick={async () => {
            onHide();
            onStartTracking();
          }}
          icon="pi pi-play"
          autoFocus
        />
      </div>
    </Dialog>
  );
};

export default StartTrackingDialog;
