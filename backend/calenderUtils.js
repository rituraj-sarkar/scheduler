const moment = require("moment-timezone");
const ld = require("lodash");

function generateTimeSlots(
  startDate,
  endDate,
  duration,
  eventStartTimes,
  eventEndtimes,
  appointeeTimezone
) {
  const timeSlots = [];
  let currentSlot = new Date(startDate);

  while (currentSlot <= endDate) {
    const slotEnd = new Date(currentSlot.getTime() + (duration - 1));
    const newStartSlot = new Date(currentSlot.getTime() + duration);
    let lowerBoundIndex = ld.sortedIndex(
      eventStartTimes,
      currentSlot.getTime()
    );
    let upperBoundIndex = ld.sortedLastIndex(
      eventStartTimes,
      currentSlot.getTime()
    );
    while (
      lowerBoundIndex > 0 &&
      currentSlot.getTime() > eventStartTimes[lowerBoundIndex - 1]
    ) {
      lowerBoundIndex--;
    }
    if (
      isConflicted(
        lowerBoundIndex,
        upperBoundIndex,
        currentSlot.getTime(),
        slotEnd.getTime(),
        eventStartTimes,
        eventEndtimes
      )
    ) {
      timeSlots.push({
        start: moment.tz(currentSlot.getTime(), appointeeTimezone).format(),
        end: moment.tz(slotEnd.getTime(), appointeeTimezone).format(),
      });
    }
    currentSlot = newStartSlot;
  }

  return timeSlots;
}

function isConflicted(
  lowerBoundIndex,
  upperBoundIndex,
  currentSlot,
  slotEnd,
  eventStartTimes,
  eventEndtimes
) {
  for (i = lowerBoundIndex; i <= upperBoundIndex; i++) {
    if (
      isConflictedInterval(
        currentSlot,
        slotEnd,
        eventStartTimes[i],
        eventEndtimes[i]
      ) ||
      isConflictedInterval(
        eventStartTimes[i],
        eventEndtimes[i],
        currentSlot,
        slotEnd
      )
    ) {
      return false;
    }
  }
  return true;
}

function isConflictedInterval(
  interval1start,
  interval1end,
  interval2start,
  interval2end
) {
  return interval1start <= interval2end && interval1end >= interval2start;
}

function getEventsSeparatedInStartTimeAndEndTime(events) {
  const eventStartTimes = [];
  const eventEndtimes = [];

  events.forEach((event) => {
    eventStartTimes.push(new Date(event.start.dateTime).getTime());
    eventEndtimes.push(new Date(event.end.dateTime).getTime());
  });

  return {
    eventStartTimes,
    eventEndtimes,
  };
}

module.exports = {
  generateTimeSlots,
  getEventsSeparatedInStartTimeAndEndTime,
};
