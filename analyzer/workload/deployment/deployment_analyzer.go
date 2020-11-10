package deployment

import (
	appsv1 "k8s.io/api/apps/v1"
	"karto/types"
)

type Analyzer interface {
	Analyze(deployment *appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) *types.Deployment
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(deployment *appsv1.Deployment,
	replicaSets []*appsv1.ReplicaSet) *types.Deployment {
	targetReplicaSets := make([]types.ReplicaSetRef, 0)
	for _, replicaSet := range replicaSets {
		if *replicaSet.Spec.Replicas == 0 {
			continue
		}
		for _, ownerReference := range replicaSet.OwnerReferences {
			if ownerReference.UID == deployment.UID {
				targetReplicaSets = append(targetReplicaSets, analyzer.toReplicaSetRef(replicaSet))
				break
			}
		}
	}
	return &types.Deployment{
		Name:              deployment.Name,
		Namespace:         deployment.Namespace,
		TargetReplicaSets: targetReplicaSets,
	}
}

func (analyzer analyzerImpl) toReplicaSetRef(replicaSet *appsv1.ReplicaSet) types.ReplicaSetRef {
	return types.ReplicaSetRef{
		Name:      replicaSet.Name,
		Namespace: replicaSet.Namespace,
	}
}
