package utils

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"log"
)

func SelectorMatches(objectLabels map[string]string, labelSelector metav1.LabelSelector) bool {
	selector, err := metav1.LabelSelectorAsSelector(&labelSelector)
	if err != nil {
		log.Fatalf("Could not parse LabelSelector %v\n", labelSelector)
		return false
	}
	return selector.Matches(labels.Set(objectLabels))
}

func LabelsMatches(objectLabels map[string]string, matchLabels map[string]string) bool {
	if matchLabels == nil {
		return false
	}
	return SelectorMatches(objectLabels, *metav1.SetAsLabelSelector(matchLabels))
}
