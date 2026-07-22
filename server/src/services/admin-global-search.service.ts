import * as AdminGlobalSearchRepository from '../repositories/admin-global-search.repository';

/**
 * Get admin dashboard summary for current month
 */
export const getDashboardSummary = async () => {
  return AdminGlobalSearchRepository.getAdminDashboardSummary();
};

/**
 * Perform global search across all entities with filters
 */
export const performGlobalSearch = async (params: {
  search?: string;
  entity?: 'all' | 'companies' | 'employees';
  status?: 'active' | 'inactive' | 'pending' | 'verified' | 'unverified';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  // Parse date strings to Date objects if provided
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (params.startDate) {
    startDate = new Date(params.startDate);
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start date format. Use ISO 8601 format (YYYY-MM-DD).');
    }
  }

  if (params.endDate) {
    endDate = new Date(params.endDate);
    // Set time to end of day
    endDate.setHours(23, 59, 59, 999);
    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid end date format. Use ISO 8601 format (YYYY-MM-DD).');
    }
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    throw new Error('Start date must be before end date.');
  }

  // Validate pagination
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20)); // Max 100 per page

  // Validate sort
  const allowedSortFields = ['createdAt', 'fullName', 'email'];
  const sortBy = allowedSortFields.includes(params.sortBy || '') ? params.sortBy : 'createdAt';
  const sortOrder = (params.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  // Validate entity type - only companies and employees
  const validEntities = ['all', 'companies', 'employees'];
  const entity = (validEntities.includes(params.entity || '') ? params.entity : 'all') as 'all' | 'companies' | 'employees';

  // Validate status
  const validStatuses = ['active', 'inactive', 'pending', 'verified', 'unverified'];
  const status = validStatuses.includes(params.status || '') ? (params.status as any) : undefined;

  return await AdminGlobalSearchRepository.globalSearch({
    search: params.search?.trim() || '',
    entity,
    status,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder,
  });
};
