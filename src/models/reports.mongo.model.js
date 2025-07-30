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
    languageId: { type: String, required: true },
    boardId: { type: String, required: true }, // 'cbse', 'icse', 'state_board', etc.
    classId: { type: String, required: true, enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11_science', '11_arts', '11_commerce', '12_science', '12_arts', '12_commerce'] },
    sessionId: { type: String, required: true },  // licenseKey_d1g1_userId_d1g1_timestamp; '_d1g1_' is a delimiter
    categoryId: { type: String, required: true },
    subcategoryId: { type: String, required: true },
    contentId: { type: String, required: true },
    contentName: { type: String, required: true },
    metrics: {
      completionPercentage: { type: Number, required: true },
      duration: { type: Number, required: true }, // milliseconds
      correctAnswers: { type: Number },
      totalQuestionsAttempted: { type: Number },
      pagesViewed: { type: Number },
      interactionPoints: { type: Number },
      level: { type: Number },
    },
    deviceInfo: {
      type: { type: String, enum: ['mobile', 'tablet', 'ifp', 'tv', 'other'] },
      os: { type: String, enum: ['android', 'ios', 'windows', 'linux', 'macos', 'other'] },
      deviceId: { type: String }
    },
    metadata: {
      schoolId: { type: String, required: true },
      licenseKey: { type: String, required: true },
      projectId: { type: String, required: true },
      syncedAt: { type: Date, default: Date.now }, // Timestamp when the report was synced
      syncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' } // Status of the report sync
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