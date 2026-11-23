import React from 'react';
import {Card, Text} from '@/components/ui';
import {formatDateTime} from '@/utils/format';
import type {Complaint} from '@/types';

export function ComplaintOwnership({complaint, staff = false}: {complaint: Complaint; staff?: boolean}) {
  const {departmentName, officerName, assignmentDueAt, resolutionDueAt, escalatedAt, triageReason, reviewReason, status} = complaint;
  if (!resolutionDueAt && !departmentName && !officerName) return null;
  const open = !['resolved', 'closed', 'rejected'].includes(status);
  return (
    <Card style={{gap: 5}}>
      <Text variant="label">Ownership and deadlines</Text>
      <Text>{departmentName ?? 'Department pending'}{officerName ? ' · ' + officerName : ''}</Text>
      {open && assignmentDueAt && ['submitted', 'acknowledged'].includes(status) ? (
        <Text>Assignment due · {formatDateTime(assignmentDueAt)}</Text>
      ) : null}
      {open && resolutionDueAt ? <Text>Resolution due · {formatDateTime(resolutionDueAt)}</Text> : null}
      {escalatedAt ? <Text>Escalated · {formatDateTime(escalatedAt)}</Text> : null}
      {staff && triageReason ? <Text>Initial triage · {triageReason}</Text> : null}
      {staff && reviewReason ? <Text>{reviewReason}</Text> : null}
    </Card>
  );
}
