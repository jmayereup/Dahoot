import { useMemo } from 'react';
import { deterministicShuffle } from '../utils/shuffle';
import {
  getMcOptions,
  getDragDropChoices,
  getDropDownChoices,
  getSortingCorrect,
  normalizeQuestion
} from '../utils/questionSchema';

function emptyResult() {
  return {
    mcOptions: [],
    sortingPool: [],
    dragDropChoices: [],
    dropDownChoices: [],
    categorizeItems: [],
    categorizeCategories: []
  };
}

export function useShuffledOptions(question, seed) {
  return useMemo(() => {
    if (!question) return emptyResult();

    const n = normalizeQuestion(question);
    const safeSeed = seed || question.id || '';

    const mcOpts = getMcOptions(question);
    const sortingSeq = getSortingCorrect(question);
    const dragChoices = getDragDropChoices(question);
    const dropdowns = n?.options?.dropdowns || [];
    const dropChoices = dropdowns.map((_, idx) => getDropDownChoices(question, idx));
    const catItems = n?.options?.items || [];
    const catCats = n?.options?.categories || [];

    return {
      mcOptions: deterministicShuffle(mcOpts, safeSeed)
        .map(o => ({ item: o.item, originalIdx: mcOpts.indexOf(o.item) })),
      sortingPool: deterministicShuffle(sortingSeq, safeSeed).map(o => o.item),
      dragDropChoices: deterministicShuffle(dragChoices, safeSeed).map(o => o.item),
      dropDownChoices: dropChoices.map((c, idx) =>
        deterministicShuffle(c, `${safeSeed}-${idx}`).map(o => o.item)
      ),
      categorizeItems: deterministicShuffle(catItems, safeSeed).map(o => o.item),
      categorizeCategories: deterministicShuffle(catCats, `${safeSeed}-cats`)
        .map(o => o.item)
    };
  }, [question?.id, question?.options, seed]);
}
