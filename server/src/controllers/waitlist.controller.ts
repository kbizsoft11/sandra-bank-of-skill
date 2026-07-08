import { Request, Response } from 'express';
import { waitlistRepository } from '../repositories/waitlist.repository';
import { CreateWaitlistDto } from '../dto/waitlist.dto';

export const addToWaitlist = async (req: Request, res: Response) => {
  const payload = req.body as CreateWaitlistDto;

  try {
    const exists = await waitlistRepository.findByEmail(payload.email);
    if (exists) {
      return res.status(200).json({ success: true, message: 'Already on the waiting list' });
    }

    await waitlistRepository.create(payload);

    return res.status(201).json({ success: true, message: 'Added to waiting list' });
  } catch (err) {
    console.error('Waitlist error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
