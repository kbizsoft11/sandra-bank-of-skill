import { Request, Response } from 'express';
import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { SupportTicketModel } from '../models/support-ticket.model';
import { systemSettingsService } from '../services/system-settings.service';
import { sendEmail } from '../services/email.service';

export const getSupportTickets = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const query: any = {
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  };

  if (user.role === 'employee') {
    query.createdBy = user.userId;
  }

  const [tickets, total] = await Promise.all([
    SupportTicketModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SupportTicketModel.countDocuments(query),
  ]);

  return sendResponse(res, 200, 'Support tickets retrieved successfully', {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getSupportTicketById = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const query: any = {
    _id: id,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  };

  if (user.role === 'employee') {
    query.createdBy = user.userId;
  }

  const ticket = await SupportTicketModel.findOne(query).lean();

  if (!ticket) {
    return sendResponse(res, 404, 'Support ticket not found', null);
  }

  return sendResponse(res, 200, 'Support ticket retrieved successfully', ticket);
});

export const createSupportTicket = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { subject, description, category, priority } = req.body;

  const ticket = await SupportTicketModel.create({
    subject,
    description,
    category: category || 'General',
    priority: priority || 'normal',
    status: 'open',
    createdBy: user.userId,
    createdByName: user.fullName || 'Unknown',
    createdByEmail: user.email || 'unknown@example.com',
    createdByRole: user.role,
    organisationId: user.organisationId,
    tenantId: user.tenantId,
  });

  let message = 'Support ticket submitted successfully.';

  try {
    const settings = await systemSettingsService.getSettingsPublic();
    const supportEmail = settings?.supportEmail;

    if (supportEmail) {
      await sendEmail({
        to: supportEmail,
        subject: `New support ticket from ${ticket.createdByName}`,
        html: `<p>A new support ticket has been submitted.</p>
               <p><strong>Subject:</strong> ${ticket.subject}</p>
               <p><strong>Description:</strong><br/>${ticket.description}</p>
               <p><strong>Category:</strong> ${ticket.category}</p>
               <p><strong>Priority:</strong> ${ticket.priority}</p>
               <p><strong>Submitted by:</strong> ${ticket.createdByName} (${ticket.createdByEmail})</p>
               <p><strong>Role:</strong> ${ticket.createdByRole}</p>
               <p><strong>Organisation ID:</strong> ${ticket.organisationId || 'N/A'}</p>`,
        text: `A new support ticket has been submitted.
Subject: ${ticket.subject}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}
Submitted by: ${ticket.createdByName} (${ticket.createdByEmail})
Role: ${ticket.createdByRole}
Organisation ID: ${ticket.organisationId || 'N/A'}`,
      });
      message = 'Support ticket submitted and support team notified successfully.';
    }
  } catch (error) {
    console.error('Failed to send support ticket email notification:', error);
    message = 'Support ticket submitted successfully. Support email notification failed.';
  }

  return sendResponse(res, 201, message, ticket);
});

export const updateSupportTicketStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { status, note } = req.body;

  // Only admin and company roles can update ticket status
  if (user.role !== 'admin' && user.role !== 'company') {
    return sendResponse(res, 403, 'You do not have permission to update ticket status', null);
  }

  const query: any = {
    _id: id,
    tenantId: user.tenantId,
  };

  // Company can only update tickets in their organisation
  if (user.role === 'company') {
    query.organisationId = user.organisationId;
  }

  const ticket = await SupportTicketModel.findOne(query);

  if (!ticket) {
    return sendResponse(res, 404, 'Support ticket not found', null);
  }

  // Prevent updating closed tickets
  if (ticket.status === 'closed') {
    return sendResponse(res, 400, 'Cannot update a closed ticket. Closed tickets are locked and cannot be modified.', null);
  }

  const previousStatus = ticket.status;

  // Add status update to history
  if (!ticket.statusHistory) {
    ticket.statusHistory = [];
  }

  ticket.statusHistory.push({
    updatedBy: user.userId,
    updatedByName: user.fullName || 'Unknown',
    updatedByRole: user.role,
    previousStatus,
    newStatus: status,
    note: note || '',
    updatedAt: new Date(),
  });

  ticket.status = status;
  await ticket.save();

  return sendResponse(res, 200, 'Support ticket status updated successfully', ticket);
});
