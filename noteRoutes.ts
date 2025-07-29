import express, { Request, Response } from 'express';
import Note from '../models/Note';
import authMiddleware, { AuthRequest } from '../middleware/authMiddleware'; // Ensure the middleware uses JWT validation

const router = express.Router();

// ✅ Get Notes
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user?.email; // User info is added by the authMiddleware
    console.log('🔍 Fetching notes for:', userEmail);

    const notes = await Note.find({ email: userEmail });
    res.status(200).json(notes);
  } catch (err) {
    console.error('❌ Error fetching notes:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ✅ Create Note
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, content } = req.body;
  const userEmail = req.user?.email; // Extracted from the token

  console.log('📥 Create Note Payload:', { title, content, email: userEmail });

  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized: No email in token' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const newNote = new Note({ title, content, email: userEmail });
    await newNote.save();

    console.log('✅ Note created:', newNote);
    res.status(201).json(newNote);
  } catch (err) {
    console.error('❌ Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// ✅ Delete Note
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await Note.findOneAndDelete({
      _id: req.params.id,
      email: req.user?.email, // Ensures the note belongs to the authenticated user
    });

    if (!result) {
      return res.status(404).json({ error: 'Note not found' });
    }

    console.log('🗑️ Note deleted:', result && '_id' in result ? result._id : req.params.id);
    res.status(200).json({ message: 'Note deleted' });
  } catch (err) {
    console.error('❌ Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ✅ Update Note (PUT)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, content } = req.body;
  const userEmail = req.user?.email;

  // Validate the input data
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    // Find the note by ID and update it
    const updatedNote = await Note.findOneAndUpdate(
        { _id: req.params.id, email: userEmail },  // Ensure the note belongs to the user
        { title, content }, // Update title and content
        { new: true } // Return the updated note
    );

    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Send back the updated note
    console.log('✅ Note updated:', updatedNote);
    res.status(200).json(updatedNote);
  } catch (err) {
    console.error('❌ Error updating note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

export default router;
