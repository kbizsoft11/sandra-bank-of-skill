import { UserModel } from '../models/user.model';

export const userListService = {
  getDepartments: async () => {
    const departments = await UserModel.aggregate([
      { $match: { department: { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: '$department' }, value: { $first: '$department' } } },
      { $sort: { value: 1 } },
      { $project: { _id: 0, value: 1 } },
    ]);
    return departments.map((item: any) => item.value);
  },

  getTeams: async () => {
    const teams = await UserModel.aggregate([
      { $match: { team: { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: '$team' }, value: { $first: '$team' } } },
      { $sort: { value: 1 } },
      { $project: { _id: 0, value: 1 } },
    ]);
    return teams.map((item: any) => item.value);
  },

  getJobRoles: async () => {
    const jobRoles = await UserModel.aggregate([
      { $match: { title: { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: '$title' }, value: { $first: '$title' } } },
      { $sort: { value: 1 } },
      { $project: { _id: 0, value: 1 } },
    ]);
    return jobRoles.map((item: any) => item.value);
  },
};
