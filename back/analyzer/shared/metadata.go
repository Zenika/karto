package shared

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"karto/commons"
)

func SelectorMatches(objectLabels map[string]string, labelSelector metav1.LabelSelector) bool {
	selector, _ := metav1.LabelSelectorAsSelector(&labelSelector)
	return selector.Matches(labels.Set(objectLabels))
}

func IsOwnedBy(objectOwned metav1.Object, objectOwning metav1.Object) bool {
	return commons.AnyMatch(objectOwned.GetOwnerReferences(), func(ownerReference metav1.OwnerReference) bool {
		return ownerReference.UID == objectOwning.GetUID()
	})
}
