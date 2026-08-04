import { Schema, model } from "mongoose";
import { IUser } from "../types/user.types";

const UserSchema = new Schema<IUser>(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            required: false,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: [
                "admin",
                "company",
                "employee"
            ],
            default: 'employee',
        },

        tenantId: {
            type: String,
        },

        organisationId: {
            type: String,
        },

        designationId: {
            type: String,
        },

        team: {
            type: String,
        },

        department: {
            type: String,
        },

        location: {
            type: String,
        },

        profileCompleted: {
            type: Boolean,
            default: false,
        },

        hasCompletedOnboarding: {
            type: Boolean,
            default: false,
            index: true,
        },

        emailVerified: {
            type: Boolean,
            default: false,
        },

        verificationCode: {
            type: String,
        },

        verificationCodeExpiresAt: {
            type: Date,
        },

        onboardingStatus: {
            type: String,
            enum: [
                'registered',
                'email_verified',
                'completed'
            ],
            default: 'registered',
        },

        isActive: {
            type: Boolean,
            default: true
        },

        accountStatus: {
            type: String,
            enum: ['invited', 'joined', 'active', 'inactive', 'suspended'],
            default: 'active',
        },

        invitedAt: {
            type: Date,
        },

        lastLoginAt: {
            type: Date,
        },

        profileImage: {
            type: String,
            required: false,
        },

        title: {
            type: String,
            required: false,
            trim: true,
        },

        bio: {
            type: String,
            required: false,
            trim: true,
        },

        socialLinks: {
            facebook: {
                type: String,
                required: false,
            },
            twitter: {
                type: String,
                required: false,
            },
            linkedin: {
                type: String,
                required: false,
            },
        },

        // PRISM Brain Mapping Assessment
        prismAssessment: {
            clientId: {
                type: String,
                required: false,
            },
            externalIdent: {
                type: String,
                required: false,
            },
            questStatus: {
                type: Number,
                enum: [1, 2, 3, 4, 5, 6],
                required: false,
            },
            lastFetchedAt: {
                type: Date,
                required: false,
            },
            questionnaire: {
                qTypeId: {
                    type: Number,
                    required: false,
                },
                questId: {
                    type: String,
                    required: false,
                },
                randomCode: {
                    type: String,
                    required: false,
                },
                actionUrl: {
                    type: String,
                    required: false,
                },
            },
            report: {
                reportData: {
                    type: Map,
                    of: Schema.Types.Mixed,
                    required: false,
                },
                basicMapUrl: {
                    type: String,
                    required: false,
                },
                fullMapUrl: {
                    type: String,
                    required: false,
                },
                unlockedAt: {
                    type: Date,
                    required: false,
                },
            },
        },

    },

    {
        timestamps: true,
    }
);

export const UserModel = model<IUser>(
    'User',
    UserSchema
);
