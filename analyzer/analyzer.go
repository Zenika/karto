package analyzer

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/workqueue"
	"karto/types"
	"log"
	"sort"
	"time"
)

var portWildcard int32 = -1

type podIsolation struct {
	Pod             *corev1.Pod
	IngressPolicies []*networkingv1.NetworkPolicy
	EgressPolicies  []*networkingv1.NetworkPolicy
}

func (podIsolation *podIsolation) IsIngressIsolated() bool {
	return len(podIsolation.IngressPolicies) != 0
}

func (podIsolation *podIsolation) IsEgressIsolated() bool {
	return len(podIsolation.EgressPolicies) != 0
}

func (podIsolation *podIsolation) AddIngressPolicy(ingressPolicy *networkingv1.NetworkPolicy) {
	podIsolation.IngressPolicies = append(podIsolation.IngressPolicies, ingressPolicy)
}

func (podIsolation *podIsolation) AddEgressPolicy(egressPolicy *networkingv1.NetworkPolicy) {
	podIsolation.EgressPolicies = append(podIsolation.EgressPolicies, egressPolicy)
}

func newPodIsolation(pod *corev1.Pod) podIsolation {
	return podIsolation{
		Pod:             pod,
		IngressPolicies: make([]*networkingv1.NetworkPolicy, 0),
		EgressPolicies:  make([]*networkingv1.NetworkPolicy, 0),
	}
}

type clusterState struct {
	Namespaces  []*corev1.Namespace
	Pods        []*corev1.Pod
	Services    []*corev1.Service
	ReplicaSets []*appsv1.ReplicaSet
	Deployments []*appsv1.Deployment
	Policies    []*networkingv1.NetworkPolicy
}

func AnalyzeOnChange(k8sConfigPath string, resultsChannel chan<- types.AnalysisResult) {
	k8sClient := getK8sClient(k8sConfigPath)
	analyzeQueue := workqueue.NewRateLimitingQueue(workqueue.DefaultItemBasedRateLimiter())
	informerFactory := informers.NewSharedInformerFactory(k8sClient, 0)
	namespacesInformer := informerFactory.Core().V1().Namespaces()
	podInformer := informerFactory.Core().V1().Pods()
	servicesInformer := informerFactory.Core().V1().Services()
	replicaSetsInformer := informerFactory.Apps().V1().ReplicaSets()
	deploymentsInformer := informerFactory.Apps().V1().Deployments()
	policiesInformer := informerFactory.Networking().V1().NetworkPolicies()
	eventHandler := cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { analyzeQueue.Add(nil) },
		UpdateFunc: func(oldObj, newObj interface{}) { analyzeQueue.Add(nil) },
		DeleteFunc: func(obj interface{}) { analyzeQueue.Add(nil) },
	}
	namespacesInformer.Informer().AddEventHandler(eventHandler)
	podInformer.Informer().AddEventHandler(eventHandler)
	servicesInformer.Informer().AddEventHandler(eventHandler)
	replicaSetsInformer.Informer().AddEventHandler(eventHandler)
	deploymentsInformer.Informer().AddEventHandler(eventHandler)
	policiesInformer.Informer().AddEventHandler(eventHandler)
	informerFactory.Start(wait.NeverStop)
	informerFactory.WaitForCacheSync(wait.NeverStop)
	for {
		obj, _ := analyzeQueue.Get()
		namespaces, err := namespacesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		pods, err := podInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		services, err := servicesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		replicaSets, err := replicaSetsInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		deployments, err := deploymentsInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		policies, err := policiesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		resultsChannel <- analyze(clusterState{
			Namespaces:  namespaces,
			Pods:        pods,
			Services:    services,
			ReplicaSets: replicaSets,
			Deployments: deployments,
			Policies:    policies,
		})
		analyzeQueue.Forget(obj)
		analyzeQueue.Done(obj)
	}
}

func getK8sClient(k8sClientConfig string) *kubernetes.Clientset {
	var config *rest.Config
	var err1InsideCluster, errOutsideCluster error
	config, err1InsideCluster = rest.InClusterConfig()
	if err1InsideCluster != nil {
		log.Println("Unable to connect to Kubernetes service, fallback to kubeconfig file")
		config, errOutsideCluster = clientcmd.BuildConfigFromFlags("", k8sClientConfig)
		if errOutsideCluster != nil {
			panic(errOutsideCluster.Error())
		}
	}
	k8sClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}
	return k8sClient
}

func analyze(clusterState clusterState) types.AnalysisResult {
	start := time.Now()
	// TODO split in multiple services
	// TODO maybe we also simplify mapper names this way?
	podIsolations := computePodIsolations(clusterState.Pods, clusterState.Policies)
	allowedRoutes := computeAllowedRoutes(podIsolations, clusterState.Namespaces)
	servicesWithTargetPods := computeServicesWithTargetPods(clusterState.Services, clusterState.Pods)
	replicaSetsWithTargetPods := computeReplicaSetsWithTargetPods(clusterState.ReplicaSets, clusterState.Pods)
	deploymentsWithTargetReplicaSets := computeDeploymentsWithTargetReplicaSets(clusterState.Deployments, clusterState.ReplicaSets)
	elapsed := time.Since(start)
	log.Printf("Finished analysis in %s, found %d pods and %d allowed pod-to-pod routes\n", elapsed, len(podIsolations), len(allowedRoutes))
	// TODO log info about other items found
	return types.AnalysisResult{
		Pods:          k8sPodIsolationsToPods(podIsolations),
		AllowedRoutes: allowedRoutes,
		Services:      servicesWithTargetPods,
		ReplicaSets:   replicaSetsWithTargetPods,
		Deployments:   deploymentsWithTargetReplicaSets,
	}
}

func computePodIsolations(pods []*corev1.Pod, policies []*networkingv1.NetworkPolicy) []podIsolation {
	podIsolations := make([]podIsolation, 0)
	for _, pod := range pods {
		podIsolation := computePodIsolation(pod, policies)
		podIsolations = append(podIsolations, podIsolation)
	}
	return podIsolations
}

func computePodIsolation(pod *corev1.Pod, policies []*networkingv1.NetworkPolicy) podIsolation {
	podIsolation := newPodIsolation(pod)
	for _, policy := range policies {
		namespaceMatches := networkPolicyNamespaceMatches(pod, policy)
		selectorMatches := selectorMatches(pod.Labels, policy.Spec.PodSelector)
		if namespaceMatches && selectorMatches {
			isIngress, isEgress := policyTypes(policy)
			if isIngress {
				podIsolation.AddIngressPolicy(policy)
			}
			if isEgress {
				podIsolation.AddEgressPolicy(policy)
			}
		}
	}
	return podIsolation
}

func policyTypes(policy *networkingv1.NetworkPolicy) (bool, bool) {
	var isIngress, isEgress bool
	for _, policyType := range policy.Spec.PolicyTypes {
		if policyType == "Ingress" {
			isIngress = true
		} else if policyType == "Egress" {
			isEgress = true
		}
	}
	return isIngress, isEgress
}

func computeAllowedRoutes(podIsolations []podIsolation, namespaces []*corev1.Namespace) []types.AllowedRoute {
	allowedRoutes := make([]types.AllowedRoute, 0)
	for i, sourcePodIsolation := range podIsolations {
		for j, targetPodIsolation := range podIsolations {
			if i == j {
				// Ignore traffic to itself
				continue
			}
			allowedRoute := computeAllowedRoute(sourcePodIsolation, targetPodIsolation, namespaces)
			if allowedRoute != nil {
				allowedRoutes = append(allowedRoutes, *allowedRoute)
			}
		}
	}
	return allowedRoutes
}

func computeAllowedRoute(sourcePodIsolation podIsolation, targetPodIsolation podIsolation, namespaces []*corev1.Namespace) *types.AllowedRoute {
	ingressPoliciesByPort := ingressPoliciesByPort(sourcePodIsolation.Pod, targetPodIsolation, namespaces)
	egressPoliciesByPort := egressPoliciesByPort(targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	ports, ingressPolicies, egressPolicies := matchPoliciesByPort(ingressPoliciesByPort, egressPoliciesByPort)
	if ports == nil || len(ports) > 0 {
		return &types.AllowedRoute{
			SourcePod:       k8sPodIsolationToPodRef(sourcePodIsolation),
			EgressPolicies:  k8sNetworkPoliciesToNetworkPolicies(egressPolicies),
			TargetPod:       k8sPodIsolationToPodRef(targetPodIsolation),
			IngressPolicies: k8sNetworkPoliciesToNetworkPolicies(ingressPolicies),
			Ports:           ports,
		}
	} else {
		return nil
	}
}

func computeServicesWithTargetPods(services []*corev1.Service, pods []*corev1.Pod) []types.Service {
	servicesWithTargetPods := make([]types.Service, 0)
	for _, service := range services {
		serviceWithTargetPods := computeServiceWithTargetPods(service, pods)
		servicesWithTargetPods = append(servicesWithTargetPods, serviceWithTargetPods)
	}
	return servicesWithTargetPods
}

func computeServiceWithTargetPods(service *corev1.Service, pods []*corev1.Pod) types.Service {
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		namespaceMatches := serviceNamespaceMatches(pod, service)
		selectorMatches := labelsMatches(pod.Labels, service.Spec.Selector)
		if namespaceMatches && selectorMatches {
			targetPods = append(targetPods, k8sPodToPodRef(pod))
		}
	}
	return types.Service{
		Name:       service.Name,
		Namespace:  service.Namespace,
		TargetPods: targetPods,
	}
}

func computeReplicaSetsWithTargetPods(replicaSets []*appsv1.ReplicaSet, pods []*corev1.Pod) []types.ReplicaSet {
	replicaSetsWithTargetPods := make([]types.ReplicaSet, 0)
	for _, replicaSet := range replicaSets {
		replicaSetWithTargetPods := computeReplicaSetWithTargetPods(replicaSet, pods)
		if replicaSetWithTargetPods != nil {
			replicaSetsWithTargetPods = append(replicaSetsWithTargetPods, *replicaSetWithTargetPods)
		}
	}
	return replicaSetsWithTargetPods
}

func computeReplicaSetWithTargetPods(replicaSet *appsv1.ReplicaSet, pods []*corev1.Pod) *types.ReplicaSet {
	if *replicaSet.Spec.Replicas == 0 {
		return nil
	}
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		namespaceMatches := replicaSetNamespaceMatches(pod, replicaSet)
		selectorMatches := selectorMatches(pod.Labels, *replicaSet.Spec.Selector)
		if namespaceMatches && selectorMatches {
			targetPods = append(targetPods, k8sPodToPodRef(pod))
		}
	}
	return &types.ReplicaSet{
		Name:       replicaSet.Name,
		Namespace:  replicaSet.Namespace,
		TargetPods: targetPods,
	}
}

func computeDeploymentsWithTargetReplicaSets(deployments []*appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) []types.Deployment {
	deploymentsWithTargetReplicaSets := make([]types.Deployment, 0)
	for _, deployment := range deployments {
		deploymentWithTargetReplicaSets := computeDeploymentWithTargetReplicaSets(deployment, replicaSets)
		if deploymentWithTargetReplicaSets != nil {
			deploymentsWithTargetReplicaSets = append(deploymentsWithTargetReplicaSets, *deploymentWithTargetReplicaSets)
		}
	}
	return deploymentsWithTargetReplicaSets
}

func computeDeploymentWithTargetReplicaSets(deployment *appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) *types.Deployment {
	targetReplicaSets := make([]types.ReplicaSetRef, 0)
	for _, replicaSet := range replicaSets {
		if *replicaSet.Spec.Replicas == 0 {
			continue
		}
		for _, ownerReference := range replicaSet.OwnerReferences {
			if ownerReference.UID == deployment.UID {
				targetReplicaSets = append(targetReplicaSets, k8sReplicaSetToReplicaSetRef(replicaSet))
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

func ingressPoliciesByPort(sourcePod *corev1.Pod, targetPodIsolation podIsolation, namespaces []*corev1.Namespace) map[int32][]*networkingv1.NetworkPolicy {
	policiesByPort := make(map[int32][]*networkingv1.NetworkPolicy)
	if !targetPodIsolation.IsIngressIsolated() {
		policiesByPort[portWildcard] = make([]*networkingv1.NetworkPolicy, 0)
	} else {
		for i, ingressPolicy := range targetPodIsolation.IngressPolicies {
			for _, ingressRule := range ingressPolicy.Spec.Ingress {
				if ingressRuleAllows(sourcePod, ingressRule, namespaces) {
					if len(ingressRule.Ports) == 0 {
						policies := policiesByPort[portWildcard]
						if policies == nil {
							policies = make([]*networkingv1.NetworkPolicy, 0)
						}
						policies = append(policies, targetPodIsolation.IngressPolicies[i])
						policiesByPort[portWildcard] = policies
					} else {
						for _, port := range ingressRule.Ports {
							policies := policiesByPort[port.Port.IntVal]
							if policies == nil {
								policies = make([]*networkingv1.NetworkPolicy, 0)
							}
							policies = append(policies, targetPodIsolation.IngressPolicies[i])
							policiesByPort[port.Port.IntVal] = policies
						}
					}
				}
			}
		}
	}
	return policiesByPort
}

func ingressRuleAllows(sourcePod *corev1.Pod, ingressRule networkingv1.NetworkPolicyIngressRule, namespaces []*corev1.Namespace) bool {
	for _, policyPeer := range ingressRule.From {
		if networkRuleMatches(sourcePod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func egressPoliciesByPort(targetPod *corev1.Pod, sourcePodIsolation podIsolation, namespaces []*corev1.Namespace) map[int32][]*networkingv1.NetworkPolicy {
	policiesByPort := make(map[int32][]*networkingv1.NetworkPolicy)
	if !sourcePodIsolation.IsEgressIsolated() {
		policiesByPort[portWildcard] = make([]*networkingv1.NetworkPolicy, 0)
	} else {
		for i, egressPolicy := range sourcePodIsolation.EgressPolicies {
			for _, egressRule := range egressPolicy.Spec.Egress {
				if egressRuleAllows(targetPod, egressRule, namespaces) {
					if len(egressRule.Ports) == 0 {
						policies := policiesByPort[portWildcard]
						if policies == nil {
							policies = make([]*networkingv1.NetworkPolicy, 0)
						}
						policies = append(policies, sourcePodIsolation.EgressPolicies[i])
						policiesByPort[portWildcard] = policies
					} else {
						for _, port := range egressRule.Ports {
							policies := policiesByPort[port.Port.IntVal]
							if policies == nil {
								policies = make([]*networkingv1.NetworkPolicy, 0)
							}
							policies = append(policies, sourcePodIsolation.EgressPolicies[i])
							policiesByPort[port.Port.IntVal] = policies
						}
					}
				}
			}
		}
	}
	return policiesByPort
}

func egressRuleAllows(targetPod *corev1.Pod, egressRule networkingv1.NetworkPolicyEgressRule, namespaces []*corev1.Namespace) bool {
	for _, policyPeer := range egressRule.To {
		if networkRuleMatches(targetPod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func matchPoliciesByPort(ingressPoliciesByPort map[int32][]*networkingv1.NetworkPolicy, egressPoliciesByPort map[int32][]*networkingv1.NetworkPolicy) ([]int32, []*networkingv1.NetworkPolicy, []*networkingv1.NetworkPolicy) {
	portsSet := make(map[int32]bool)
	ingressPoliciesSet := make(map[*networkingv1.NetworkPolicy]bool)
	egressPoliciesSet := make(map[*networkingv1.NetworkPolicy]bool)
	for ingressPort, ingressPolicies := range ingressPoliciesByPort {
		for egressPort, egressPolicies := range egressPoliciesByPort {
			if ingressPort == portWildcard || egressPort == portWildcard || ingressPort == egressPort {
				if ingressPort == portWildcard {
					portsSet[egressPort] = true
				} else {
					portsSet[ingressPort] = true
				}
				for _, egressPolicy := range egressPolicies {
					egressPoliciesSet[egressPolicy] = true
				}
				for _, ingressPolicy := range ingressPolicies {
					ingressPoliciesSet[ingressPolicy] = true
				}
			}
		}
	}
	if portsSet[portWildcard] {
		portsSet = nil
	}
	var ports []int32
	if portsSet != nil {
		ports = make([]int32, 0, len(portsSet))
		for port := range portsSet {
			ports = append(ports, port)
		}
		sort.Slice(ports, func(i, j int) bool { return ports[i] < ports[j] })
	}
	ingressPolicies := make([]*networkingv1.NetworkPolicy, 0)
	for ingressPolicy := range ingressPoliciesSet {
		ingressPolicies = append(ingressPolicies, ingressPolicy)
	}
	egressPolicies := make([]*networkingv1.NetworkPolicy, 0)
	for egressPolicy := range egressPoliciesSet {
		egressPolicies = append(egressPolicies, egressPolicy)
	}
	return ports, ingressPolicies, egressPolicies
}

func networkRuleMatches(pod *corev1.Pod, policyPeer networkingv1.NetworkPolicyPeer, namespaces []*corev1.Namespace) bool {
	namespaceMatches := policyPeer.NamespaceSelector == nil || namespaceLabelsMatches(pod.Namespace, namespaces, *policyPeer.NamespaceSelector)
	selectorMatches := policyPeer.PodSelector == nil || selectorMatches(pod.Labels, *policyPeer.PodSelector)
	return selectorMatches && namespaceMatches
}

func namespaceLabelsMatches(namespaceName string, namespaces []*corev1.Namespace, selector metav1.LabelSelector) bool {
	var namespace corev1.Namespace
	for _, candidateNamespace := range namespaces {
		if candidateNamespace.Name == namespaceName {
			namespace = *candidateNamespace
			break
		}
	}
	return selectorMatches(namespace.Labels, selector)
}

func networkPolicyNamespaceMatches(pod *corev1.Pod, policy *networkingv1.NetworkPolicy) bool {
	return pod.Namespace == policy.Namespace
}

func serviceNamespaceMatches(pod *corev1.Pod, service *corev1.Service) bool {
	return pod.Namespace == service.Namespace
}

func replicaSetNamespaceMatches(pod *corev1.Pod, replicaSet *appsv1.ReplicaSet) bool {
	return pod.Namespace == replicaSet.Namespace
}

func selectorMatches(objectLabels map[string]string, labelSelector metav1.LabelSelector) bool {
	selector, err := metav1.LabelSelectorAsSelector(&labelSelector)
	if err != nil {
		log.Fatalf("Could not parse LabelSelector %v\n", labelSelector)
		return false
	}
	return selector.Matches(labels.Set(objectLabels))
}

func labelsMatches(objectLabels map[string]string, matchLabels map[string]string) bool {
	if matchLabels == nil {
		return false
	}
	return selectorMatches(objectLabels, *metav1.SetAsLabelSelector(matchLabels))
}

func k8sPodIsolationToPod(podIsolation podIsolation) types.Pod {
	return types.Pod{
		Name:              podIsolation.Pod.Name,
		Namespace:         podIsolation.Pod.Namespace,
		Labels:            podIsolation.Pod.Labels,
		IsIngressIsolated: podIsolation.IsIngressIsolated(),
		IsEgressIsolated:  podIsolation.IsEgressIsolated(),
	}
}

func k8sPodIsolationsToPods(podIsolations []podIsolation) []types.Pod {
	result := make([]types.Pod, 0)
	for _, podIsolation := range podIsolations {
		result = append(result, k8sPodIsolationToPod(podIsolation))
	}
	return result
}

func k8sPodToPodRef(pod *corev1.Pod) types.PodRef {
	return types.PodRef{
		Name:      pod.Name,
		Namespace: pod.Namespace,
	}
}

func k8sReplicaSetToReplicaSetRef(replicaSet *appsv1.ReplicaSet) types.ReplicaSetRef {
	return types.ReplicaSetRef{
		Name:      replicaSet.Name,
		Namespace: replicaSet.Namespace,
	}
}

func k8sPodIsolationToPodRef(podIsolation podIsolation) types.PodRef {
	return types.PodRef{
		Name:      podIsolation.Pod.Name,
		Namespace: podIsolation.Pod.Namespace,
	}
}

func k8sNetworkPolicyToNetworkPolicy(networkPolicy networkingv1.NetworkPolicy) types.NetworkPolicy {
	return types.NetworkPolicy{
		Name:      networkPolicy.Name,
		Namespace: networkPolicy.Namespace,
		Labels:    networkPolicy.Labels,
	}
}

func k8sNetworkPoliciesToNetworkPolicies(networkPolicies []*networkingv1.NetworkPolicy) []types.NetworkPolicy {
	result := make([]types.NetworkPolicy, 0)
	for _, networkPolicy := range networkPolicies {
		result = append(result, k8sNetworkPolicyToNetworkPolicy(*networkPolicy))
	}
	return result
}
