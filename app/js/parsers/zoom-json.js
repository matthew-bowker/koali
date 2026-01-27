/**
 * Parse Zoom JSON transcript format.
 * Returns { type, cues[], speakers[], meetingTopic }
 */
export async function parseZoomJSON(file) {
  const text = typeof file === 'string' ? file : await file.text();
  const data = JSON.parse(text);
  const speakerSet = new Set();
  const cues = [];

  const timeline = data.timeline || data.segments || data.results || [];

  for (let i = 0; i < timeline.length; i++) {
    const entry = timeline[i];
    const speaker = entry.speaker_name || entry.speaker || entry.username || null;
    if (speaker) speakerSet.add(speaker);

    const startMs = entry.start_time || entry.start || entry.startTime || 0;
    const endMs = entry.end_time || entry.end || entry.endTime || 0;

    cues.push({
      index: i,
      startTime: msToTimestamp(startMs),
      endTime: msToTimestamp(endMs),
      speaker,
      text: (entry.text || entry.content || '').trim()
    });
  }

  return {
    type: 'transcript-zoom-json',
    cues,
    speakers: Array.from(speakerSet),
    meetingTopic: data.meeting_topic || data.topic || '',
    text: cues.map(c => c.text).join('\n')
  };
}

function msToTimestamp(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSec % 60).padStart(2, '0');
  const millis = String(ms % 1000).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${millis}`;
}
