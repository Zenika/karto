package utils

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
)

func SelectorMatches(objectLabels map[string]string, labelSelector metav1.LabelSelector) bool {
	selector, _ := metav1.LabelSelectorAsSelector(&labelSelector)
	return selector.Matches(labels.Set(objectLabels))
}

func LabelsMatches(objectLabels map[string]string, matchLabels map[string]string) bool {
	if matchLabels == nil {
		return false
	}
	return SelectorMatches(objectLabels, *metav1.SetAsLabelSelector(matchLabels))
}
