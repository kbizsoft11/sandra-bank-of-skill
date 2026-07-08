import { WaitlistModel } from '../models/waitlist.model';

export const waitlistRepository = {
  create: async (payload: { name?: string; email: string; source?: string }) => {
    return WaitlistModel.create(payload);
  },

  findByEmail: async (email: string) => {
    return WaitlistModel.findOne({ email });
  }
};
