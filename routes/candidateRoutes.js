const express = require('express');
const router = express.Router();
const Candidate = require('../models/candidate');
const User = require('../models/user'); // Ensure this import is correct
const { jwtAuthMiddleware } = require('./../jwt');

// Check if the user has an admin role
const checkAdminRole = async (userId) => {
    try {
        const user = await User.findById(userId);
        return user && user.role === 'admin';
    } catch (err) {
        console.error('Error checking admin role:', err);
        return false;
    }
};

// POST route to add a candidate
router.post('/', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!await checkAdminRole(req.user.id)) {
            return res.status(403).json({ message: 'User does not have admin role' });
        }

        const data = req.body; // Assuming the request body contains candidate data
        const newCandidate = new Candidate(data);
        const response = await newCandidate.save();
        console.log('Data saved');

        res.status(200).json({ response });
    } catch (err) {
        console.error('Error saving candidate:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT route to update a candidate
router.put('/:candidateID', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!await checkAdminRole(req.user.id)) {
            return res.status(403).json({ message: 'User does not have admin role' });
        }

        const candidateID = req.params.candidateID;
        const updatedCandidateData = req.body;

        const response = await Candidate.findByIdAndUpdate(candidateID, updatedCandidateData, {
            new: true,
            runValidators: true,
        });

        if (!response) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        console.log('Candidate data updated');
        res.status(200).json(response);
    } catch (err) {
        console.error('Error updating candidate:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE route to delete a candidate
router.delete('/:candidateID', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!await checkAdminRole(req.user.id)) {
            return res.status(403).json({ message: 'User does not have admin role' });
        }

        const candidateID = req.params.candidateID;

        const response = await Candidate.findByIdAndDelete(candidateID);

        if (!response) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        console.log('Candidate deleted');
        res.status(200).json(response);
    } catch (err) {
        console.error('Error deleting candidate:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST route to vote for a candidate
router.post('/vote/:candidateID', jwtAuthMiddleware, async (req, res) => {
    const candidateID = req.params.candidateID;
    const userId = req.user.id;

    try {
        // Find the Candidate document with the specified candidateID
        const candidate = await Candidate.findById(candidateID);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Admin is not allowed to vote' });
        }
        if (user.isVoted) {
            return res.status(400).json({ message: 'You have already voted' });
        }

        // Update the Candidate document to record the vote
        candidate.votes.push({ user: userId });
        candidate.voteCount++;
        await candidate.save();

        // Update the User document
        user.isVoted = true;
        await user.save();

        return res.status(200).json({ message: 'Vote recorded successfully' });
    } catch (err) {
        console.error('Error recording vote:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET route to retrieve vote count
router.get('/vote/count', async (req, res) => {
    try {
        // Find all candidates and sort them by voteCount in descending order
        const candidates = await Candidate.find().sort({ voteCount: 'desc' });

        // Map the candidates to return their party and voteCount
        const voteRecord = candidates.map((candidate) => ({
            party: candidate.party,
            count: candidate.voteCount
        }));

        return res.status(200).json(voteRecord);
    } catch (err) {
        console.error('Error retrieving vote count:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
