package deployment

import (
	appsv1 "k8s.io/api/apps/v1"
	"karto/analyzer/shared"
	"karto/commons"
	"karto/types"
)

type Analyzer interface {
	Analyze(deployment *appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) *types.Deployment
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(
	deployment *appsv1.Deployment,
	replicaSets []*appsv1.ReplicaSet,
) *types.Deployment {
	targetReplicaSets := commons.Filter(replicaSets, func(replicaSet *appsv1.ReplicaSet) bool {
		return *replicaSet.Spec.Replicas != 0 && shared.IsOwnedBy(replicaSet, deployment)
	})
	return &types.Deployment{
		Name:              deployment.Name,
		Namespace:         deployment.Namespace,
		TargetReplicaSets: commons.Map(targetReplicaSets, shared.ToReplicaSetRef),
	}
}
