# Frequently Asked Questions

## General

**Q: What browsers are supported?**
A: Chrome 90+, Edge 90+, Firefox 88+, Safari 14+. IE not supported.

**Q: Do I need to install anything?**
A: Just a modern web browser. The API server runs on localhost.

**Q: Can I access remotely?**
A: Yes, configure firewall to allow port 3003 (UI) and 9103 (API).

## Connections

**Q: Device not discovered?**
A: Check network connectivity, firewall settings, and device IP. Try manual connection.

**Q: Connection keeps dropping?**
A: Increase timeout settings, check network quality, verify no IP conflicts.

## Data

**Q: Why is data not updating?**
A: Verify device online, check auto-refresh enabled, try manual refresh.

**Q: How long is data stored?**
A: 24 hours real-time, 1 year historical. Archive for longer retention.

**Q: Can I export data?**
A: Yes, from Trend Logs page - CSV, Excel, or JSON format.

## Performance

**Q: Page loading slow?**
A: Reduce displayed points, increase refresh interval, close unused tabs.

**Q: Database locked errors?**
A: System automatically retries up to 51 seconds. Normal during high load.

## Alarms

**Q: Alarms not triggering?**
A: Check alarm enabled, verify thresholds, test notification settings.

**Q: Too many false alarms?**
A: Adjust thresholds, add deadband, increase time delay, improve filtering.

## Troubleshooting

**Q: Where are log files?**
A: Browser console (F12) for UI errors, API logs in api/logs/ folder.

**Q: How to reset system?**
A: Clear browser cache, restart API server, reload page.

**Q: Who to contact for help?**
A: Check documentation first, then contact support with error details.

