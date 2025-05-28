import mongoose from 'mongoose';

/**
 * Notes:
 *  sessionId: Represents the journey of the user through the content from the time of login to the time of logout.
 *             The timestamp in the sessionId represents the beginning of the session.
 *  reportId: Represents the id of the single instance of the usage of the content by the user.
 *      The timestamp in reportId or the timestamp in the metrics represents the begining of the instance usage.
 * 
 */

export default new mongoose.Schema(
  {
    reportId: { type: String, required: true }, // licenseKey_d1g1_userId_d1g1_timestamp
    chapterId: { type: String, required: true },
    chapterName: { type: String, required: true },
    subjectId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    accessedAt: { type: Date, required: true },
    timestamp: { type: Date, required: true },
    schoolId: { type: String, required: true },
    deviceId: { type: String, required: true },
    deviceType: { type: String, required: true, enum: ['mobile', 'tablet', 'ifp', 'tv', 'other'] },
    languageId: { type: String, required: true },
    classId: { type: String, required: true, enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11_science', '11_arts', '11_commerce', '12_science', '12_arts', '12_commerce'] },
    sessionId: { type: String, required: true },  // licenseKey_d1g1_userId_d1g1_timestamp; '_d1g1_' is a delimiter
    metrics: {
      completionPercentage: { type: Number, required: true },
      duration: { type: Number, required: true }, // milliseconds instead of seconds
      correctAnswers: { type: Number, required: true },
      totalQuestionsAttempted: { type: Number, required: true },
      pagesViewed: { type: Number, required: true },
      //interactionPoints: { type: Number, required: true },
      level: { type: Number, required: true },
    },
    deviceInfo: {
      type: { type: String, required: true },
      os: { type: String, required: true },
    },
    metadata: {
      schoolId: { type: String, required: true },
      licenseKey: { type: String, required: true },
      projectId: { type: String, required: true },
    },
  },
  { timestamps: true }
);

//{
//	"schoolId": {
//		"timestamp_d1g1_licenseKey": {  // '_d1g1_' is a delimiter
//			"userId": 'String',
//			"contentId": 'String',
//			"contentName": 'String',
//			"contentType": 'String', // 'question', 'book', 'video', 'interactive', 'game', 'other'
//			"subcategoryId": 'String', // syllabus_videos, assessments, syllabus_books, syllabus_notes, simulation, worksheet, etc.
//			"subcategoryName": 'String',
//			"categoryId": 'String', // curricular_content, activity_content, games, etc.
//			"categoryName": 'String',
//			"languageId": 'String',
//			"languageName": 'String',
//			"classId": 'String',
//			"className": 'String',
//			"boardId": 'String',
//			"boardName": 'String',
//			"subjectId": 'String',
//			"subjectName": 'String',
//			"timestamp": 'String', // timestamp in ISO format YYYY-MM-DDTHH:MM:SS.SSSZ
//			"sessionId": 'String', // licenseKey_d1g1_userId_d1g1_timestamp // '_d1g1_' is a delimiter
//			"metrics": {
//				"completionPercentage": Number, // for videos, assessments, books and other content types -> if this value is given, then total values such as totalQuestions, totalPages, totalDuration can be calculated where applicable

//				/**
//					calcualte completionPercentage for individual content types based on the following values:
//					totalQuestions, totalPages, totalDuration
//					completionPercentage = (totalQuestionsAttempted / totalQuestions) * 100
//					completionPercentage = (pagesViewed / totalPages) * 100
//					completionPercentage = (duration / totalDuration) * 100					
//				 */

//				"duration": Number, // milliseconds
//				"correctAnswers": Number, // applicable only content_type = 'question'
//				"totalQuestionsAttempted": Number, // applicable only content_type = 'question'
//				"pagesViewed": Number, // applicable only content_type = 'book'
//				"level": Number,
//			},
//			"deviceInfo": {
//				"type": String, // mobile, tablet, ifp, tv, etc.
//				"os": String // android, ios, windows, etc.
//			},
//			"metadata": {
//				"schoolId": 'String',
//				"licenseKey": 'String',
//				"projectId": 'String'
//			}
//		}
//	}
//}