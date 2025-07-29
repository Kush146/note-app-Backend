import mongoose, { Schema, Document } from 'mongoose';

// Interface for typing the Note document
interface INote extends Document {
    title: string;
    content: string;
    email: string;
}

const noteSchema: Schema = new Schema<INote>(
    {
        title: {
            type: String,
            required: true,
            minlength: [3, 'Title must be at least 3 characters long'], // Validate title length
            maxlength: [100, 'Title cannot exceed 100 characters'], // Max title length
        },
        content: {
            type: String,
            required: true,
            // Removed minlength validation here
        },
        email: {
            type: String,
            required: true,
            lowercase: true, // Convert email to lowercase for consistency
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'], // Email validation regex
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Create index on the email field for faster lookup (optional)
noteSchema.index({ email: 1 });

const Note = mongoose.model<INote>('Note', noteSchema);

export default Note;
