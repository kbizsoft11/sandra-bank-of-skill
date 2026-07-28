import {
    Component,
    inject,
    signal,
    OnInit,
    computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';

interface PendingQuestion {
    _id: string;
    questionId: string;
    questionText: string;
    questionType: string;
    skillDescription?: string;
    options?: string[];
    required: boolean;
    order: number;
    status: string;
    questionnaireId?: string;
}

interface QuestionnaireData {
    _id: string;
    title: string;
    description: string;
    isOnboarding: boolean;
}

interface AssignedQuestionnaire {
    _id: string;
    title: string;
    description: string;
    categoryId?: string;
    categoryTitle?: string;
    responseId: string;
    status: string;
    completedAt?: string;
    progress?: any;
}

interface Progress {
    total: number;
    answered: number;
    pending: number;
    percentComplete: number;
}

@Component({
    selector: 'app-my-questionnaires',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './my-questionnaires.html',
    styleUrl: './my-questionnaires.scss'
})
export class MyQuestionnaires implements OnInit {

    private readonly questionnaireService = inject(QuestionnaireService);
    private readonly alertService = inject(AlertService);
    readonly router = inject(Router);
    readonly auth = inject(AuthService);

    // State
    readonly isLoading = signal<boolean>(true);
    readonly isSaving = signal<boolean>(false);
    readonly responseId = signal<string>('');
    readonly questionnaire = signal<QuestionnaireData | null>(null);
    readonly allQuestionnaires = signal<AssignedQuestionnaire[]>([]);
    readonly currentQuestionnaireIndex = signal<number>(0);
    readonly currentQuestionnaire = computed(() => {
        const questionnaires = this.allQuestionnaires();
        const index = this.currentQuestionnaireIndex();
        return questionnaires[index] || null;
    });
    readonly pendingQuestions = signal<PendingQuestion[]>([]);
    readonly currentQuestion = computed(() => this.pendingQuestions()[0] || null);
    readonly progress = signal<Progress>({ total: 0, answered: 0, pending: 0, percentComplete: 0 });
    readonly overallProgress = computed(() => {
        const questionnaires = this.allQuestionnaires();
        if (questionnaires.length === 0) return { completed: 0, total: 0, percent: 0 };
        const completed = questionnaires.filter(q => q.status === 'completed').length;
        return {
            completed,
            total: questionnaires.length,
            percent: Math.round((completed / questionnaires.length) * 100)
        };
    });
    readonly questionnaireGroups = computed(() => {
        const grouped = new Map<string, {
            categoryId?: string;
            categoryTitle: string;
            items: Array<AssignedQuestionnaire & { index: number }>;
        }>();

        this.allQuestionnaires().forEach((questionnaire, index) => {
            const key = questionnaire.categoryId || 'general';
            const title = questionnaire.categoryTitle || 'General Assessment';
            const group = grouped.get(key);

            if (!group) {
                grouped.set(key, {
                    categoryId: questionnaire.categoryId,
                    categoryTitle: title,
                    items: [{ ...questionnaire, index }],
                });
            } else {
                group.items.push({ ...questionnaire, index });
            }
        });

        return Array.from(grouped.values());
    });
    readonly completedAllQuestionnaires = signal<any | null>(null);
    readonly isRetaking = signal<boolean>(false);
    // UI toggles referenced by template
    readonly prefillExisting = signal<boolean>(true);
    readonly showFeedbackAnimations = signal<boolean>(true);
    readonly showCompletedSkills = signal<boolean>(false);
    // Per-question answer state (skill & interest levels)
    readonly answersMap = signal<Record<string, { skillLevel: number | null; interestLevel: number | null; isSaving?: boolean; answered?: boolean; skillPrefilled?: boolean; interestPrefilled?: boolean }>>({});
    
    // Answer state
    readonly selectedSkillLevel = signal<number | null>(null);
    readonly selectedInterestLevel = signal<number | null>(null);
    readonly showAnsweredAnimation = signal<boolean>(false);
    // computed set of answered question ids (mostly for prefilled values)
    readonly answeredQuestionIds = computed(() => {
        const map = this.answersMap();
        const set = new Set<string>();
        Object.keys(map).forEach((k) => {
            const v: any = map[k] as any;
            if (v && v.answered) set.add(k);
        });
        return set;
    });
    
    // Track the last saved question to prevent duplicate saves
    private lastSavedQuestionId: string | null = null;
    private loadingQuestionnaires = false;
    private startingQuestionnaire = false;

    // Rating options
    readonly skillLevelOptions = [
        { value: 5, label: 'Highly Skilled' },
        { value: 4, label: 'Developed Skills' },
        { value: 3, label: 'Competent' },
        { value: 2, label: 'Basic Capability' },
        { value: 1, label: 'Very Low' },
        { value: 0, label: 'N/A' },
    ];

    readonly interestLevelOptions = [
        { value: 5, label: 'Highly Interested' },
        { value: 4, label: 'Interested' },
        { value: 3, label: 'Neutral' },
        { value: 2, label: 'Low Interest' },
        { value: 1, label: 'Very Low' },
        { value: 0, label: 'N/A' },
    ];

    ngOnInit(): void {
        this.loadQuestionnaire();
    }

    // Build nav items used in the left navigation from grouped questionnaires
    navItems() {
        const groups = this.questionnaireGroups();
        const items: Array<{ id: string; label: string; count: number; index: number }> = [];
        groups.forEach((g) => {
            g.items.forEach((it: any) => {
                items.push({ id: it._id, label: it.categoryTitle || it.title || 'Assessment', count: it.progress?.pending ?? 0, index: it.index });
            });
        });
        return items;
    }

    togglePrefillExisting(): void { this.prefillExisting.set(!this.prefillExisting()); }
    toggleShowFeedbackAnimations(): void { this.showFeedbackAnimations.set(!this.showFeedbackAnimations()); }
    toggleShowCompletedSkills(): void { this.showCompletedSkills.set(!this.showCompletedSkills()); }

    loadQuestionnaire(): void {
        // Prevent duplicate calls
        if (this.loadingQuestionnaires) {
            return;
        }
        
        this.loadingQuestionnaires = true;
        this.isLoading.set(true);

        // Fetch all assigned questionnaires
        this.questionnaireService.getAssignedQuestionnaires().subscribe({
            next: (response) => {
                if (!response.success || !response.data || response.data.length === 0) {
                    this.alertService.info('No questionnaires assigned');
                    this.isLoading.set(false);
                    this.loadingQuestionnaires = false;
                    this.router.navigate(['/employee/dashboard']);
                    return;
                }

                // Store all questionnaires
                this.allQuestionnaires.set(response.data);
                
                // Check if all are completed
                const incompletedIndex = response.data.findIndex((q: any) => q.status !== 'completed');
                
                if (incompletedIndex === -1) {
                    // All completed
                    this.completedAllQuestionnaires.set({
                        questionnaires: response.data,
                        completedAt: new Date().toISOString(),
                    });
                    this.isLoading.set(false);
                    this.loadingQuestionnaires = false;
                    return;
                }

                // Start with first incomplete questionnaire
                this.currentQuestionnaireIndex.set(incompletedIndex);
                this.startQuestionnaire(response.data[incompletedIndex].responseId);
            },
            error: (err) => {
                console.error('Error loading questionnaires:', err);
                this.alertService.error('Failed to load questionnaires');
                this.isLoading.set(false);
                this.loadingQuestionnaires = false;
            }
        });
    }

    startQuestionnaire(responseId: string): void {
        // Prevent duplicate starts
        if (this.startingQuestionnaire) {
            return;
        }
        this.startingQuestionnaire = true;
        this.isLoading.set(true);
        
        this.questionnaireService.startQuestionnaire(responseId).subscribe({
            next: (response) => {
                if (!response.success || !response.data) {
                    this.alertService.error('Failed to load questionnaire questions');
                    this.isLoading.set(false);
                    this.startingQuestionnaire = false;
                    return;
                }

                const questionnaire = response.data.questionnaire;
                const questions = response.data.pendingQuestions || [];
                const progress = response.data.progress || { total: 0, answered: 0, pending: 0, percentComplete: 0 };

                this.questionnaire.set(questionnaire);
                this.pendingQuestions.set(questions);
                this.progress.set(progress);
                this.responseId.set(responseId);
                // Initialize per-question answer map so the UI can render selections for each card
                const map: Record<string, { skillLevel: number | null; interestLevel: number | null; isSaving?: boolean; answered?: boolean; skillPrefilled?: boolean; interestPrefilled?: boolean }> = {};
                (questions || []).forEach((q: any) => {
                    // detect possible prefilled values from various response shapes
                    const prefilledSkill = q.skillLevel ?? q.existingSkillLevel ?? q.answer?.skillLevel ?? q.prefill?.skillLevel ?? q.prefilled?.skillLevel ?? null;
                    const prefilledInterest = q.interestLevel ?? q.existingInterestLevel ?? q.answer?.interestLevel ?? q.prefill?.interestLevel ?? q.prefilled?.interestLevel ?? null;
                    const hasSkill = prefilledSkill !== null && prefilledSkill !== undefined;
                    const hasInterest = prefilledInterest !== null && prefilledInterest !== undefined;

                    map[q.questionId] = {
                        skillLevel: hasSkill ? prefilledSkill : null,
                        interestLevel: hasInterest ? prefilledInterest : null,
                        isSaving: false,
                        answered: hasSkill || hasInterest,
                        skillPrefilled: !!hasSkill,
                        interestPrefilled: !!hasInterest,
                    };
                });
                this.answersMap.set(map);
                this.selectedSkillLevel.set(null);
                this.selectedInterestLevel.set(null);
                this.showAnsweredAnimation.set(false);
                this.isLoading.set(false);
                this.startingQuestionnaire = false;

                if (questions.length === 0) {
                    this.handleQuestionnireComplete();
                }
            },
            error: (err) => {
                console.error('Error starting questionnaire:', err);
                this.alertService.error('Failed to load questionnaire');
                this.isLoading.set(false);
                this.startingQuestionnaire = false;
            }
        });
    }

    selectSkillLevel(value: number): void {
        if (this.isSaving()) return;
        
        this.selectedSkillLevel.set(value);
        this.checkAndSaveAnswer();
    }

    selectInterestLevel(value: number): void {
        if (this.isSaving()) return;
        
        this.selectedInterestLevel.set(value);
        this.checkAndSaveAnswer();
    }

    // Selectors for per-question cards
    selectSkillLevelFor(questionId: string, value: number): void {
        const map = { ...this.answersMap() };
        if (!map[questionId] || map[questionId].isSaving) return;
        map[questionId] = { ...map[questionId], skillLevel: value };
        this.answersMap.set(map);
        this.maybeSaveForQuestion(questionId);
    }

    selectInterestLevelFor(questionId: string, value: number): void {
        const map = { ...this.answersMap() };
        if (!map[questionId] || map[questionId].isSaving) return;
        map[questionId] = { ...map[questionId], interestLevel: value };
        this.answersMap.set(map);
        this.maybeSaveForQuestion(questionId);
    }

    maybeSaveForQuestion(questionId: string): void {
        const map = this.answersMap();
        const entry = map[questionId];
        if (!entry) return;
        const skillLevel = entry.skillLevel;
        const interestLevel = entry.interestLevel;
        if (skillLevel !== null && interestLevel !== null) {
            this.saveAnswer(questionId, {
                skillLevel: skillLevel === 0 ? null : skillLevel,
                interestLevel: interestLevel === 0 ? null : interestLevel,
            });
        }
    }

    checkAndSaveAnswer(): void {
        const skillLevel = this.selectedSkillLevel();
        const interestLevel = this.selectedInterestLevel();
        const currentQ = this.currentQuestion();

        // Only save when both levels are selected
        if (skillLevel !== null && interestLevel !== null && currentQ) {
            this.saveAnswer(currentQ.questionId, {
                skillLevel: skillLevel === 0 ? null : skillLevel,
                interestLevel: interestLevel === 0 ? null : interestLevel,
            });
        }
    }

    saveAnswer(questionId: string, answerData: any): void {
        // Prevent duplicate saves for the same question
        if (this.lastSavedQuestionId === questionId) {
            return;
        }

        this.lastSavedQuestionId = questionId;
        // Mark per-question saving flag
        const mapBefore = { ...this.answersMap() };
        if (mapBefore[questionId]) {
            mapBefore[questionId].isSaving = true;
            this.answersMap.set(mapBefore);
        }
        this.isSaving.set(true);
        const responseId = this.responseId();

        this.questionnaireService.saveQuestionAnswer(responseId, questionId, answerData).subscribe({
            next: (response) => {
                if (!response.success) {
                    this.alertService.error('Failed to save answer');
                    this.isSaving.set(false);
                    const mapErr = { ...this.answersMap() };
                    if (mapErr[questionId]) mapErr[questionId].isSaving = false;
                    this.answersMap.set(mapErr);
                    this.lastSavedQuestionId = null;
                    return;
                }

                // Update progress
                this.progress.set(response.data.progress);

                // Show animation
                this.showAnsweredAnimation.set(true);

                // Remove answered question after animation
                setTimeout(() => {
                    const pending = this.pendingQuestions();
                    const updated = pending.filter(q => q.questionId !== questionId);
                    this.pendingQuestions.set(updated);

                    // Reset answer state for next question
                    // clear per-question state
                    const mapNow = { ...this.answersMap() };
                    delete mapNow[questionId];
                    this.answersMap.set(mapNow);
                    this.showAnsweredAnimation.set(false);
                    this.isSaving.set(false);
                    this.lastSavedQuestionId = null;

                    // Check if all done
                    if (updated.length === 0) {
                        this.handleQuestionnireComplete();
                    }
                }, 600); // Match animation duration
            },
            error: (err) => {
                console.error('Error saving answer:', err);
                const errorMessage = err.error?.message || 'Failed to save answer. Please try again.';
                this.alertService.error(errorMessage);
                // clear saving flag
                const mapErr = { ...this.answersMap() };
                if (mapErr[questionId]) mapErr[questionId].isSaving = false;
                this.answersMap.set(mapErr);
                this.isSaving.set(false);
                this.lastSavedQuestionId = null;
            }
        });
    }

    handleQuestionnireComplete(): void {
        const questionnaires = this.allQuestionnaires();
        const currentIndex = this.currentQuestionnaireIndex();
        
        // Mark current questionnaire as completed in the list
        if (questionnaires[currentIndex]) {
            questionnaires[currentIndex].status = 'completed';
            questionnaires[currentIndex].completedAt = new Date().toISOString();
        }

        // Find the next incomplete questionnaire anywhere in the list
        const nextIncompleteIndex = questionnaires.findIndex((q) => q.status !== 'completed');
        
        if (nextIncompleteIndex !== -1) {
            this.currentQuestionnaireIndex.set(nextIncompleteIndex);
            this.pendingQuestions.set([]);
            this.progress.set({ total: 0, answered: 0, pending: 0, percentComplete: 0 });
            this.selectedSkillLevel.set(null);
            this.selectedInterestLevel.set(null);
            this.alertService.success('✅ Questionnaire completed! Moving to the next one...');
            setTimeout(() => {
                this.startQuestionnaire(questionnaires[nextIncompleteIndex].responseId);
            }, 1000);
        } else {
            // All questionnaires completed
            this.completedAllQuestionnaires.set({
                questionnaires: this.allQuestionnaires(),
                completedAt: new Date().toISOString(),
            });
            this.alertService.success('🎉 All assessments completed successfully!');
        }
    }

    moveToQuestionnaire(index: number): void {
        const questionnaires = this.allQuestionnaires();
        if (index >= 0 && index < questionnaires.length && questionnaires[index].status !== 'completed') {
            this.currentQuestionnaireIndex.set(index);
            this.pendingQuestions.set([]);
            this.progress.set({ total: 0, answered: 0, pending: 0, percentComplete: 0 });
            this.selectedSkillLevel.set(null);
            this.selectedInterestLevel.set(null);
            this.startQuestionnaire(questionnaires[index].responseId);
        }
    }

    retakeAllQuestionnaires(): void {
        if (this.isRetaking()) {
            return;
        }

        const completed = this.completedAllQuestionnaires()?.questionnaires || [];
        if (completed.length === 0) {
            this.alertService.info('No completed assessments to retake');
            return;
        }

        this.isRetaking.set(true);
        this.isLoading.set(true);

        const retakeRequests = completed.map((item: any) =>
            this.questionnaireService.retakeQuestionnaire(item.responseId).pipe(
                catchError((error) => {
                    console.error('Error retaking questionnaire', item.responseId, error);
                    return of(null);
                })
            )
        );

        forkJoin(retakeRequests).subscribe({
            next: () => {
                this.completedAllQuestionnaires.set(null);
                this.currentQuestionnaireIndex.set(0);
                this.allQuestionnaires.set([]);
                this.pendingQuestions.set([]);
                this.progress.set({ total: 0, answered: 0, pending: 0, percentComplete: 0 });
                this.loadQuestionnaire();
                this.isRetaking.set(false);
            },
            error: (err) => {
                console.error('Error retaking all questionnaires:', err);
                this.alertService.error('Failed to retake all assessments. Please try again.');
                this.isRetaking.set(false);
                this.isLoading.set(false);
            }
        });
    }

    getUserInitials(): string {
        const user = this.auth.user();
        const fullName = (user as any)?.fullName || 'User';
        const names = fullName.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return fullName.substring(0, 2).toUpperCase();
    }

    getUserFirstName(): string {
        const user = this.auth.user();
        const fullName = (user as any)?.fullName || 'there';
        return fullName.split(' ')[0];
    }
}