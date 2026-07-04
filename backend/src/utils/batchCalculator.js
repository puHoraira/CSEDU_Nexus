/**
 * CSEDU Batch Calculator
 * 
 * CSEDU B.Sc. Hons program started in 1994-95 session (Batch 1)
 * Formula: Batch Number = (Session Start Year - 1994) + 1
 */

const FIRST_BATCH_YEAR = 1994;

/**
 * Calculate batch number from session year
 * @param {number} sessionYear - Session start year (e.g., 2021 for 2021-22)
 * @returns {number} - Batch number
 */
function calculateBatchFromSession(sessionYear) {
  if (sessionYear < FIRST_BATCH_YEAR) {
    throw new Error(`Invalid session year. CSEDU started in ${FIRST_BATCH_YEAR}`);
  }
  return (sessionYear - FIRST_BATCH_YEAR) + 1;
}

/**
 * Calculate session year from batch number
 * @param {number} batchNumber - Batch number (e.g., 28)
 * @returns {number} - Session start year
 */
function calculateSessionFromBatch(batchNumber) {
  if (batchNumber < 1) {
    throw new Error('Invalid batch number. Must be >= 1');
  }
  return FIRST_BATCH_YEAR + (batchNumber - 1);
}

/**
 * Format session string from year
 * @param {number} sessionYear - Session start year (e.g., 2021)
 * @returns {string} - Formatted session (e.g., "2021-22")
 */
function formatSession(sessionYear) {
  const nextYear = sessionYear + 1;
  return `${sessionYear}-${String(nextYear).slice(-2)}`;
}

/**
 * Calculate current academic year level based on admission year
 * @param {number} admissionYear - Year of admission (e.g., 2021)
 * @param {number} currentYear - Current year (defaults to current date)
 * @returns {string} - Academic year level enum value
 */
function calculateAcademicYearLevel(admissionYear, currentYear = new Date().getFullYear()) {
  const yearsPassed = currentYear - admissionYear;
  
  // Classes typically start the year after admission
  // So 2021 admission -> classes start 2022 -> 1st year in 2022-23
  const academicYear = yearsPassed;
  
  if (academicYear <= 0) {
    return 'First_Year';
  } else if (academicYear === 1) {
    return 'First_Year';
  } else if (academicYear === 2) {
    return 'Second_Year';
  } else if (academicYear === 3) {
    return 'Third_Year';
  } else if (academicYear === 4) {
    return 'Fourth_Year';
  } else if (academicYear === 5) {
    return 'Masters';
  } else {
    return 'Graduated';
  }
}

/**
 * Get batch and session info from student ID
 * Student ID format: YYYY-XXX-XXX where YYYY is session year
 * @param {string} studentId - Student ID (e.g., "2021-222-222")
 * @returns {object} - { batchNumber, sessionYear, session }
 */
function getBatchInfoFromStudentId(studentId) {
  const parts = studentId.split('-');
  if (parts.length < 2) {
    throw new Error('Invalid student ID format');
  }
  
  const sessionYear = parseInt(parts[0]);
  if (isNaN(sessionYear) || sessionYear < FIRST_BATCH_YEAR) {
    throw new Error('Invalid session year in student ID');
  }
  
  const batchNumber = calculateBatchFromSession(sessionYear);
  const session = formatSession(sessionYear);
  
  return {
    batchNumber,
    sessionYear,
    session,
  };
}

/**
 * Validate if batch number matches session year
 * @param {number} batchNumber - Batch number
 * @param {number} sessionYear - Session start year
 * @returns {boolean} - True if valid
 */
function validateBatchAndSession(batchNumber, sessionYear) {
  const calculatedBatch = calculateBatchFromSession(sessionYear);
  return calculatedBatch === batchNumber;
}

module.exports = {
  FIRST_BATCH_YEAR,
  calculateBatchFromSession,
  calculateSessionFromBatch,
  formatSession,
  calculateAcademicYearLevel,
  getBatchInfoFromStudentId,
  validateBatchAndSession,
};
