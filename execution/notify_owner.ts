/**
 * Execution Layer — Notify Owner
 *
 * Reads /tmp/escalation.json and dispatches notifications.
 * Per CLAUDE.md Layer 3: deterministic, repeatable, auditable.
 *
 * Production integration points (stubbed):
 *   - SMS via Twilio / SNS
 *   - Email via SendGrid / SES
 *   - Slack webhook
 *
 * Usage:
 *   npx ts-node execution/notify_owner.ts
 */
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Escalation {
  problemSummary: string;
  rootCause: string;
  options: string[];
  risks: string[];
  recommendation: string;
  requiredDecision: string;
  timestamp?: string;
}

interface NotificationResult {
  channel: string;
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[notify-owner] ${new Date().toISOString()} — ${message}`);
}

function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`[notify-owner] ${new Date().toISOString()} — ERROR: ${message}`);
}

// ---------------------------------------------------------------------------
// Notification channels (stubs with clear interfaces)
// ---------------------------------------------------------------------------

/**
 * Send SMS notification.
 * Production: integrate with Twilio or AWS SNS.
 */
async function sendSms(escalation: Escalation): Promise<NotificationResult> {
  const summary = `[ESCALATION] ${escalation.problemSummary} — Decision needed: ${escalation.requiredDecision}`;
  log(`[SMS STUB] Would send: ${summary}`);

  // Production implementation:
  // const client = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  // await client.messages.create({
  //   body: summary,
  //   to: process.env.OWNER_PHONE,
  //   from: process.env.TWILIO_FROM,
  // });

  return { channel: 'sms', success: true, message: 'SMS notification logged (stub)' };
}

/**
 * Send email notification.
 * Production: integrate with SendGrid or AWS SES.
 */
async function sendEmail(escalation: Escalation): Promise<NotificationResult> {
  const subject = `[Agent Foundry Escalation] ${escalation.problemSummary}`;
  const body = [
    `Problem: ${escalation.problemSummary}`,
    `Root Cause: ${escalation.rootCause}`,
    `Options: ${escalation.options.join('; ')}`,
    `Risks: ${escalation.risks.join('; ')}`,
    `Recommendation: ${escalation.recommendation}`,
    `Decision Required: ${escalation.requiredDecision}`,
  ].join('\n');

  log(`[EMAIL STUB] Subject: ${subject}`);
  log(`[EMAIL STUB] Body:\n${body}`);

  // Production implementation:
  // await sgMail.send({
  //   to: process.env.OWNER_EMAIL,
  //   from: 'notifications@agentfoundry.io',
  //   subject,
  //   text: body,
  // });

  return { channel: 'email', success: true, message: 'Email notification logged (stub)' };
}

/**
 * Send Slack notification.
 * Production: POST to Slack webhook URL.
 */
async function sendSlack(escalation: Escalation): Promise<NotificationResult> {
  const payload = {
    text: `:rotating_light: *Escalation* — ${escalation.problemSummary}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*Problem:* ${escalation.problemSummary}`,
            `*Root Cause:* ${escalation.rootCause}`,
            `*Recommendation:* ${escalation.recommendation}`,
            `*Decision Required:* ${escalation.requiredDecision}`,
          ].join('\n'),
        },
      },
    ],
  };

  log(`[SLACK STUB] Would POST: ${JSON.stringify(payload, null, 2)}`);

  // Production implementation:
  // await axios.post(process.env.SLACK_WEBHOOK_URL, payload);

  return { channel: 'slack', success: true, message: 'Slack notification logged (stub)' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const escalationPath = path.resolve('/tmp/escalation.json');

  log('Checking for escalation file...');

  if (!fs.existsSync(escalationPath)) {
    log('No escalation file found at /tmp/escalation.json. Nothing to notify.');
    process.exit(0);
  }

  let escalation: Escalation;
  try {
    const raw = fs.readFileSync(escalationPath, 'utf-8');
    escalation = JSON.parse(raw) as Escalation;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Failed to read/parse escalation file: ${message}`);
    process.exit(1);
  }

  // Validate required fields
  const requiredFields: (keyof Escalation)[] = [
    'problemSummary',
    'rootCause',
    'options',
    'risks',
    'recommendation',
    'requiredDecision',
  ];
  for (const field of requiredFields) {
    if (!escalation[field]) {
      logError(`Escalation file missing required field: ${field}`);
      process.exit(1);
    }
  }

  log(`Escalation detected: ${escalation.problemSummary}`);
  log('Dispatching notifications...');

  const results: NotificationResult[] = [];

  // Send through all channels
  results.push(await sendSms(escalation));
  results.push(await sendEmail(escalation));
  results.push(await sendSlack(escalation));

  // Log results
  log('--- Notification Results ---');
  for (const result of results) {
    log(`  ${result.channel}: ${result.success ? 'OK' : 'FAILED'} — ${result.message}`);
  }

  const allSuccessful = results.every((r) => r.success);
  if (!allSuccessful) {
    logError('Some notifications failed to send.');
    process.exit(1);
  }

  log('All notifications dispatched successfully.');
}

main();
